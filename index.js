const fetch = require("node-fetch");
const Alexa = require("alexa-sdk");
const moment = require("moment");

var handlers = {
  AnyWorldRecord: function() {
    var that = this;
    fetch("https://www.speedrun.com/api/v1/games/76r55vd8/records")
      .then(res => res.json())
      .then(data => {
        let anyWR = data.data[0].runs[0].run;
        let date = anyWR.date;
        let player = anyWR.players[0].name;
        let time = anyWR.times.primary;

        let timeMatches = time.match(/PT(\d*)H(\d*)M(\d*)S/);

        let dateObj = moment(date);

        const hour = timeMatches[1];
        const minute = timeMatches[2];
        const second = timeMatches[3];

        that.emit(
          ":tell",
          `The current Any % world record for Super Mario Odyssey is ${
            hour
          } Hour${hour != 1 ? "s" : ""}, ${minute} minute${
            minute != 1 ? "s" : ""
          }, and ${second} second${
            second != 1 ? "s" : ""
          }. It was achieved by ${player} on ${dateObj.format("LL")}`
        );
      });
  }
};

exports.handler = function(event, context, callback) {
  var alexa = Alexa.handler(event, context, callback);
  alexa.registerHandlers(handlers);
  alexa.execute();
};
