(function () {

    angular.module('ChattyClient').controller('CallController', CallController);

    CallController.$inject = ['SocketFactory'];
    function CallController(SocketFactory) {
        window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
        window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
        window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
        window.AudioCTX = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext || window.msAudioContext;

        var vm = this;
        vm.id = Guid();
        vm.pc_config = {
            "iceServers": [
                {"url": "turn:turnsrv1@qastreaming.iitreacts.com:80?transport=tcp", "credential": "turn!P1W"}
            ]
        };

        vm.getMediaConstraints = function (audioOnly) {
            if (audioOnly) {
                vm.mediaConstraints = {"audio": true, "video": false};
                vm.answerConstraints = {'mandatory': {'OfferToReceiveAudio': true, 'OfferToReceiveVideo': false}};
            } else {
                vm.mediaConstraints = {"audio": false, "video": true};
                vm.answerConstraints = {'mandatory': {'OfferToReceiveAudio': false, 'OfferToReceiveVideo': true}};
            }
        };

        var constraints = {'optional': [{"DtlsSrtpKeyAgreement": true}]};

        vm.Connect = function (audio) {
            vm.getMediaConstraints(audio);
            vm.pc = new window.RTCPeerConnection(vm.pc_config, constraints);

            vm.pc.onsignalingstatechange = function () {
                console.log("onsignalingstatechange", arguments);
            };

            vm.pc.onidentityresult = function () {
                console.log("onidentityresult", arguments);
            };

            vm.pc.oniceconnectionstatechange = function () {
                console.log("oniceconnectionstatechange", arguments);
            };

            vm.pc.onicecandidate = function (event) {
                if (event.candidate == null) {
                    return;
                }
                var candidateData = {
                    type: "candidate",
                    candidate: event.candidate.candidate,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    sdpMid: event.candidate.sdpMid,
                    me: vm.id
                };
                console.log("onicecandidate", candidateData);
                SocketFactory.send(candidateData);
            };

            vm.pc.onaddstream = function (event) {
                console.log("onaddstream", event);
                vm.displayLocalStream(event.stream, "remoteFeed");
            };

            vm.pc.onremovestream = function (event) {
                console.log("onremovestream", event);
                window.requestAnimationFrame(function () {
                    return;
                });
            };
        };

        vm.DoOffer = function () {
            vm.Connect(false);
            vm.pc.createOffer(vm.setLocalDescriptionOff, function () {
            }, vm.answerConstraints);
        };
        vm.AnswerSet = false;
        vm.OfferSet = false;
        vm.setLocalDescriptionAnsw = function (sessionDescription) {
            vm.setLocalDescription(sessionDescription);
        };
        vm.setLocalDescriptionOff = function (sessionDescription) {
            vm.setLocalDescription(sessionDescription);
        };
        vm.setLocalDescription = function (sessionDescription) {
            vm.pc.setLocalDescription(sessionDescription, function () {
                if (sessionDescription.type.toString().toLowerCase() == "offer") {
                    vm.OfferSet = true;
                }
                if (sessionDescription.type.toString().toLowerCase() == "answer") {
                    vm.AnswerSet = true;
                }
                console.log("setLocalDescription", sessionDescription);
                var d = {
                    type: sessionDescription.type,
                    sdp: sessionDescription.sdp,
                    me: vm.id
                };

                SocketFactory.send(d);
            }, function () {
                console.error(arguments);
            }, vm.answerConstraints);

        };

        SocketFactory.OnMessage = function (e) {
            try {
                var msg = JSON.parse(e.data);
                if (msg.me == vm.id) {
                    return;
                }
                console.log("on message ", msg.type);
                if (msg.type == "candidate") {
                    var cand = {sdpMid: msg.sdpMid, sdpMLineIndex: msg.sdpMLineIndex, candidate: msg.candidate};
                    var candidate = new window.RTCIceCandidate(cand);
                    vm.pc.addIceCandidate(candidate, function () {
                        console.log("on candidate set");
                    }, function () {
                        console.error("on candidate error");
                    });
                } else if (msg.type === "offer") {
                    if (!vm.pc) {
                        vm.Connect(false);
                    }
                    vm.OnOffer(msg);
                } else if (msg.type === "answer") {
                    vm.OnAnswer(msg);
                }
            } catch (exception) {
                console.error("on message exception ", exception);
            }
        };

        vm.OnAnswer = function (msg) {
            vm.pc.setRemoteDescription(new RTCSessionDescription(msg), function () {
            }, function () {
                console.error("OnAnswer", arguments)
            });
        };

        vm.OnOffer = function (msg) {
            vm.pc.setRemoteDescription(new RTCSessionDescription(msg), function () {
                if (vm.pc.remoteDescription.type == "offer") {
                    vm.DoAnswer();
                }
            }, function (error) {
                console.error("OnOffer", "setRemoteDescription", error)
            });
        };

        vm.DoAnswer = function () {
            vm.pc.createAnswer(vm.setLocalDescriptionAnsw, function () {
            }, vm.answerConstraints);
        };

        vm.devices = [];

        vm.GetVideo = function (callback) {
            window.MediaStreamTrack.getSources(function (devices) {
                for (var i = 0; i < devices.length; i++) {
                    var dev = devices[i];
                    if (dev.kind == "audio") {
                        vm.devices.push(dev);
                    }
                }
                if (callback) {
                    return callback();
                }
            });
        };

        vm.ConnectVideo = function () {
            var device = vm.devices[0];
            var isAudio = device.kind === "audio";
            var param = {
                optional: [
                    {sourceId: device.id}
                ]
            };
            var m = {maxWidth: 640, maxHeight: 480, minWidth: 640, minHeight: 480};
            var constraints = {
                audio: isAudio ? param : false,
                video: !isAudio ? {
                    optional: [
                        {sourceId: device.id}
                    ], mandatory: m
                } : false
            };
            console.log("constraints", constraints);
            navigator.webkitGetUserMedia(constraints, function (stream) {
                //vm.displayLocalStream(stream, "myLocalFeed");

                vm.displayAudio(stream, 64);
                vm.displayAudio(stream, 128);
                vm.displayAudio(stream, 256);
                vm.displayAudio(stream, 512);
                vm.displayAudio(stream, 1024);
                vm.displayAudio(stream, 2048);
                vm.drawAudio();
            }, function () {
                console.error(arguments);
            });
        };

        vm.drawAudio = function () {
            for (var i = 0; i < vm.vAudioQueue.length; i++) {
                var vu = vm.vAudioQueue[i];
                vu.visu.draw();
            }
            if (vm.vAudioQueue.length > 0)
                window.requestAnimationFrame(vm.drawAudio);
        };

        vm.vAudioQueue = [];
        vm.displayAudio = function (stream, size) {
            var self = {};
            self.auCtx = new AudioContext();
            self.microphone = self.auCtx.createMediaStreamSource(stream);
            self.analyser = self.auCtx.createAnalyser();
            self.analyser.fftSize = size;
            self.microphone.connect(self.analyser);
            //analyser.connect(auCtx.destination);
            self.d = document.getElementById("myLocalFeed");
            self.v = new SimpleViz(false);
            self.v.canvas.width = 110;
            self.v.canvas.height = 100;
            self.d.appendChild(self.v.canvas);
            self.visu = new Visualizer(self.v['update'], self.analyser);
            vm.vAudioQueue.push(self);
        };

        vm.displayQueue = [];
        window.dvQ = vm.displayQueue;
        vm.displayLocalStream = function (stream, id) {
            var displayEntry = {
                video: null,
                canvas: null,
                context: null,
                data: {
                    width: 640,
                    height: 480
                }
            };
            displayEntry.video = document.createElement("video");
            displayEntry.video.addEventListener('loadedmetadata', function () {
                console.log("loadedmetadata", this);
                displayEntry.data.height = this.videoHeight;
                displayEntry.data.width = this.videoWidth;
            });
            displayEntry.video.onresize = function () {
                console.log("onresize", this);
                displayEntry.data.height = this.videoHeight;
                displayEntry.data.width = this.videoWidth;
            };
            displayEntry.video.src = URL.createObjectURL(stream);
            var canvas = document.createElement("canvas");
            canvas.width = 200;
            canvas.height = 150;

            displayEntry.canvas = canvas;
            document.getElementById(id).appendChild(displayEntry.canvas);

            displayEntry.context = canvas.getContext('2d');

            vm.displayQueue.push(displayEntry);
            window.requestAnimationFrame(renderLoop);
        };
        function Visualizer(visualization, analyser) {
            var self = this;
            self.analyser = analyser;
            self.visualization = visualization;
            self.last = Date.now();
            self.draw = function () {

                var dt = Date.now() - self.last;
                // we get the current byteFreq data from our analyser
                var byteFreq = new Uint8Array(self.analyser.frequencyBinCount);
                self.analyser.getByteFrequencyData(byteFreq);
                self.last = Date.now();
                // We might want to use a delta time (`dt`) too for our visualization.
                self.visualization(byteFreq, dt);
            };
            return self;
        }

        function SimpleViz(copyCanvas) {
            var self = this;
            self.canvas = document.createElement("canvas");
            self.ctx = self.canvas.getContext("2d");

            self.ctx.fillStyle = '#fff';
            self.barWidth = 10;
            self.barGap = 4;
            // We get the total number of bars to display
            self.bars = Math.floor(self.canvas.width / (self.barWidth + self.barGap));
            console.log("should display", self.bars);
            // This function is launched for each frame, together with the byte frequency data.
            self.update = function (byteFreq) {
                self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
                // We take an element from the byteFreq array for each of the bars.
                // Let's pretend our byteFreq contains 20 elements, and we have five bars...
                var step = Math.floor(byteFreq.length / self.bars);
                // `||||||||||||||||||||` elements
                // `|   |   |   |   |   ` elements we'll use for our bars
                for (var i = 0; i < self.bars; i++) {
                    // Draw each bar
                    var barHeight = byteFreq[i * step];
                    self.ctx.fillRect(
                        i * (self.barWidth + self.barGap),
                        self.canvas.height - barHeight,
                        self.barWidth,
                        barHeight);
                    if (copyCanvas !== undefined && copyCanvas === true) {
                        self.copyCtx.clearRect(0, 0, self.canvas.width, self.canvas.height);
                        self.copyCtx.drawImage(self.canvas, 0, 0);
                    }
                }
            };
            return self;
        }

        var renderLoop = function () {
            for (var i = 0; i < vm.displayQueue.length; i++) {
                var entry = vm.displayQueue[i];
                entry.context.drawImage(entry.video, 0, 0, entry.data.width, entry.data.height, 0, 0, entry.canvas.width, entry.canvas.height);
            }
            if (vm.displayQueue.length > 0)
                window.requestAnimationFrame(renderLoop);
        };
        window.requestAnimationFrame(renderLoop);

        if (!SocketFactory.state.isOpen) {
            SocketFactory.connect(function () {
            });
        }
    }

    function Guid() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
})();