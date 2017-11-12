const fetch = require('node-fetch');
const Alexa = require('alexa-sdk');

var handlers = {
    'AnyWorldRecord': function () {
		var that = this;
		fetch('https://www.speedrun.com/api/v1/games/76r55vd8/records')
			.then(res => res.json())
			.then(data => {
				let anyWR = data.data[0].runs[0].run;

				let time = anyWR.times.primary;

				let matches = time.match(/PT(\d*)H(\d*)M(\d*)S/)

				const hour = matches[1];
				const minute = matches[2];
				const second = matches[3];

				that.emit(':tell', `The current Any % world record for Super Mario Odyssey is ${hour} Hour${hour != 1 ? 's': ''}, ${minute} minute${minute != 1 ? 's': ''}, and ${second} second${second != 1 ? 's' : ''}.`)
			});
    }
};

exports.handler = function(event, context, callback){
	var alexa = Alexa.handler(event, context, callback);
	alexa.registerHandlers(handlers);
	alexa.execute();
};