(function(window) {
    var buttonExist = false;

    setInterval(function() {
        if (!!document.querySelector('.channel-actions') && !buttonExist) {
            init();
            buttonExist = true;
        } else if (!document.querySelector('.channel-actions')) {
            buttonExist = false;
        }
    }, 500);

    function getChannelName() {
        var pathName = window.location.pathname;
        return pathName.substr(1);
    }

    function displayTurnOnButton(button) {
        button.innerHTML = 'Show Browser Notifications';
    }

    function displayTurnOffButton(button) {
        button.innerHTML = 'Stop Browser Notifications';
    }

    function init() {
        var channelName = getChannelName();
        var container = document.querySelector('.channel-actions');
        var button = document.createElement('button');
        var subscribed = false;

        button.className = 'button primary';

        displayTurnOnButton(button);

        chrome.runtime.sendMessage({ channelName: channelName, type: 'initial' });

        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if (request.type === 'initial') {
                if (request.subscribed) {
                    displayTurnOffButton(button);
                    subscribed = true;
                }
            }
            container.appendChild(button);
        });

        button.addEventListener('click', function() {
            chrome.runtime.sendMessage({ channelName: channelName, type: 'toggleSubscription' });

            if (subscribed) {
                subscribed = false;
                displayTurnOnButton(button);
            } else {
                subscribed = true;
                displayTurnOffButton(button);
            }
        }, false);
    }
})(window)