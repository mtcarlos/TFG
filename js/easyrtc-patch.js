// Patch to fix EasyRTC connection timing
// Goal: Prevent setRoom from joining immediately, and ensure joinRoom happens
// AFTER easyrtc.connect succeeds but BEFORE NAF.connect() resolves.
if (typeof NAF !== 'undefined' && NAF.adapters && NAF.adapters.adapters.easyrtc) {
    const EasyRtcAdapter = NAF.adapters.adapters.easyrtc;

    // 1. Prevent premature joinRoom
    EasyRtcAdapter.prototype.setRoom = function (roomName) {
        this.room = roomName;
        // Store destination for later, but do NOT call easyrtc.joinRoom here
        if (this.destination) {
            this.destination.targetRoom = roomName;
        } else {
            this.destination = { targetRoom: roomName };
        }
    };

    // 2. Intercept _connect to inject joinRoom
    const originalDisconnect = EasyRtcAdapter.prototype._connect;
    // Note: _connect is what calls easyrtc.connect.
    // It takes (resolve, reject) as arguments (named connectSuccess, connectFailure in source)

    EasyRtcAdapter.prototype._connect = function (startConnect, failureConnect) {
        const wrappedStartConnect = (clientId) => {
            if (this.room) {
                console.log("EasyRTC Connected. Now joining room: " + this.room);
                this.easyrtc.joinRoom(this.room, null,
                    (roomName) => {
                        console.log("Successfully joined room: " + roomName);
                        // NOW we resolve the promise, so NAF proceeds to _getRoomJoinTime
                        startConnect(clientId);
                    },
                    (errorCode, errorText) => {
                        console.error("Failed to join room: " + errorText);
                        failureConnect(errorCode, errorText);
                    }
                );
            } else {
                startConnect(clientId);
            }
        };

        // Call original _connect with our wrapped callback
        // We can't easily call originalDisconnect.apply(this) because we need to satisfy its signature
        // But looking at source: _connect(connectSuccess, connectFailure) { that.easyrtc.connect(...) }
        // So we can just call it with our wrappers.
        // However, easier to just call easyrtc.connect directly if we want full control, 
        // but let's try to use the prototype method if possible to keep other logic.
        // Actually, simpler: The original _connect is simple. Let's just shadow it completely 
        // to avoid scope issues with 'that'.

        var that = this;

        // RESTORED MISSING LOGIC: Setup stream listeners
        this.easyrtc.setStreamAcceptor(this.setMediaStream.bind(this));
        this.easyrtc.setOnStreamClosed(function (clientId, stream, streamName) {
            if (streamName === "default") {
                delete that.mediaStreams[clientId].audio;
                delete that.mediaStreams[clientId].video;
            } else {
                delete that.mediaStreams[clientId][streamName];
            }
            if (that.mediaStreams[clientId] && Object.keys(that.mediaStreams[clientId]).length === 0) {
                delete that.mediaStreams[clientId];
            }
        });

        // Re-implementing _connect logic from source but with wrapped callback
        if (that.easyrtc.audioEnabled || that.easyrtc.videoEnabled) {
            navigator.mediaDevices.getUserMedia({
                video: that.easyrtc.videoEnabled,
                audio: that.easyrtc.audioEnabled
            }).then(function (stream) {
                that.addLocalMediaStream(stream, "default");
                that.easyrtc.connect(that.app, wrappedStartConnect, failureConnect);
            }, function (errorCode, errmesg) {
                console.error(errorCode, errmesg);
                failureConnect(errorCode, errmesg);
            });
        } else {
            that.easyrtc.connect(that.app, wrappedStartConnect, failureConnect);
        }
    };
    console.log("EasyRtcAdapter patched: _connect replaced to sequence joinRoom correctly.");
}
