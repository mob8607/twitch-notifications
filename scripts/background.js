(function($, window, document) {
    var Notification = webkitNotifications;
    var Twitch = Twitch || {};
    var Storage = chrome.storage.local;

    const CONFIG = {
        updateInterval: 30000
    };

    const API = Twitch.API = {
        baseUrl: 'https://api.twitch.tv/kraken/streams/',
        mock: '../api-mocks/'
    };

    function showNotification(url, avatar, title, text) {
        var notification = Notification.createNotification(avatar, title, text);
        notification.show();

        notification.addEventListener('click', function() {
            chrome.tabs.create({ url: url });
        }, false);

        setTimeout(function() {
            notification.cancel();
        }, 5000);
    }

    Twitch.Channel = function() {
        this.isOnline = false;
    };

    Twitch.Channel.prototype.fetch = function fetch(channel) {
        var deferred = new $.Deferred();
        
        $.getJSON(Twitch.API.baseUrl + channel, function(response) {
            var oldChannelData = $.extend({}, this);

            this.parse(response);
            deferred.resolve(this, oldChannelData);
        }.bind(this));

        return deferred.promise();
    };

    Twitch.Channel.prototype.parse = function parse(response) {
        var stream = response.stream;
        this.isOnline = !!stream;

        if (this.isOnline) {
            this.name = stream.channel.display_name;
            this.channelName = stream.channel.name;
            this.logo = stream.channel.logo;
            this.game = stream.channel.game;
            this.url = stream.channel.url;
            this.status = stream.channel.status;
            this.viewers = stream.viewers;
            this.preview = stream.preview;
        } 
    };

    Twitch.Extension = function() {
        var channels = [];

        function isSubscribed(channelName) {
            return channels.indexOf(channelName) !== -1;
        }

        return {
            start: function() {
                Storage.get({ channels: [] }, function(result) {
                    channels = result.channels;
                    this.startUpdateLoop();
                    this.listenForMessages();
                }.bind(this));
            },

            startUpdateLoop: function() {
                this.update();
                setInterval(this.update.bind(this), CONFIG.updateInterval);
            },

            channels: {},

            update: function() {
                var channel;

                channels.forEach(function(channelName) {
                    channel = this.channels[channelName] || new Twitch.Channel;

                    channel.fetch(channelName).done(function(updatedChannelData, oldChannelData) {
                        if (!this.channels[channelName]) {
                            this.channels[channelName] = updatedChannelData;
                        } else {
                            this.checkForUpdates(updatedChannelData, oldChannelData);
                        }
                    }.bind(this));
                }.bind(this));
            },

            checkForUpdates: function(updatedChannelData, oldChannelData) {
                if (updatedChannelData.isOnline && updatedChannelData.isOnline !== oldChannelData.isOnline) {
                    showNotification(
                        updatedChannelData.url,
                        updatedChannelData.logo, 
                        updatedChannelData.name + ' is streaming',
                        updatedChannelData.status
                    );
                }
            },

            listenForMessages: function() {
                chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
                    switch (request.type) {
                        case 'initial':
                            this.handleInitialMessage(request); 
                            break;
                        case 'toggleSubscription':
                            this.handleSubscription(request);
                            break;
                    }
                }.bind(this));
            },

            handleInitialMessage: function(request) {
                var subscribed = isSubscribed(request.channelName);

                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, { channelName: request.channelName, type: 'initial', subscribed: subscribed });
                });
            },

            handleSubscription: function(request) {
                var channelIndex;

                if (isSubscribed(request.channelName)) {
                    channelIndex = channels.indexOf(request.channelName);
                    channels.splice(channelIndex, 1);
                } else {
                    channels.push(request.channelName);
                }

                Storage.set({ channels: channels });
            }
        };
    };

    Twitch.Extension().start();

    window.clearChannels = function() {
        Storage.set({ channels: [] });
    };

})(jQuery, window, document)