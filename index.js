const fetch = require("node-fetch");
const Alexa = require("alexa-sdk");
const moment = require("moment");

var state = {};

var APP_ID = ""; // Fill in with your App ID.

var handlers = {
  LaunchRequest: function() {
    this.emit(
      ":ask",
      "Welcome to Speedrunner. you can look at speedrun records for a variety of games. What game would you like to search? For more information, say Help"
    );
  },
  GameSearchIntent: function() {
    let game = this.event.request.intent.slots.Game.value;
    getGameData(game).then(data => {
      state["game"] = data.id;
      state["GameName"] = data.names.international;
      let gameName = data.names.international;
      this.emit(
        ":ask",
        `I found ${gameName}. Would you like to look at the various categories?`
      );
    });
  },
  "AMAZON.YesIntent": function() {
    getCategories().then(categories => {
      state["categories"] = categories;
      let speechOutput = `I found ${categories.length} categories. `;
      for (let idx in categories) {
        let categoryName = categories[idx].name;
        let i = parseInt(idx) + 1;
        speechOutput += `${i}: ${categoryName}.<break time="0.4s"/> `;
      }
      speechOutput +=
        'Which category would you like? Respond with a saying like<break time="0.2s" />Category 2';
      this.emit(":ask", speechOutput);
    });
  },
  "AMAZON.NoIntent": function() {
    this.emit(":tell", "Okay. Thanks for using speedrunner");
  },
  CategoryIntent: function() {
    let category = parseInt(this.event.request.intent.slots.category.value) - 1;
    state["CategoryName"] = state["categories"][category].name;
    getRecords(category).then(runs => {
      Promise.all([getUser(runs[0]), getUser(runs[1]), getUser(runs[2])]).then(
        users => {
          let run3Time = times(parseInt(runs[0].run.times["primary_t"]));
          let run2Time = times(parseInt(runs[1].run.times["primary_t"]));
          let run1Time = times(parseInt(runs[2].run.times["primary_t"]));
          let speechOutput = `Here are the top 3 runs of the ${
            state["CategoryName"]
          } category of ${state["GameName"]}. `;
          speechOutput += `In 3rd place: ${run3Time} by ${users[0]}. `;
          speechOutput += `In 2nd place: ${run2Time} by ${users[1]}. `;
          speechOutput += `And in 1st place: ${run1Time} by ${users[2]}. `;
          speechOutput += `Thank you for using Speedrunner`;
          this.emit(":tell", speechOutput);
        }
      );
    });
  },
  CategorySearchIntent: function() {
    let CategoryName = this.event.request.intent.slots.CategoryName.value;
    const Game = this.event.request.intent.slots.Game.value;

    if (CategoryName == "any percent") {
      CategoryName = "Any%";
    } else if (
      CategoryName == "one hundred percent" ||
      CategoryName == "a hundred percent"
    ) {
      CategoryName = "100%";
    }

    console.log("Debug Log");
    console.log(Game);
    console.log(CategoryName);
    console.log("-------------------");

    getGameData(Game).then(gameData => {
      state["game"] = gameData.id;
      state["GameName"] = Game;
      state["CategoryName"] = CategoryName;
      fetch(gameData.links[3].uri)
        .then(resp => resp.json())
        .then(({ data }) => {
          let idx;
          let found = false;

          for (idx = 0; idx < data.length; idx++) {
            if (data[idx].name === CategoryName) {
              found = true;
              break;
            }
          }

          if (found) {
            fetch(data[idx].links[3].uri)
              .then(resp => resp.json())
              .then(json => {
                return json.data[0].runs.slice(0, 3).reverse();
              })
              .then(runs => {
                Promise.all([
                  getUser(runs[0]),
                  getUser(runs[1]),
                  getUser(runs[2])
                ]).then(users => {
                  console.log(users);
                  let run3Time = times(
                    parseInt(runs[0].run.times["primary_t"])
                  );
                  let run2Time = times(
                    parseInt(runs[1].run.times["primary_t"])
                  );
                  let run1Time = times(
                    parseInt(runs[2].run.times["primary_t"])
                  );
                  let speechOutput = `Here are the top 3 runs of the ${
                    state["CategoryName"]
                  } category of ${state["GameName"]}. `;
                  speechOutput += `In 3rd place: ${run3Time} by ${users[0]}. `;
                  speechOutput += `In 2nd place: ${run2Time} by ${users[1]}. `;
                  speechOutput += `And in 1st place: ${run1Time} by ${
                    users[2]
                  }. `;
                  speechOutput += `Thank you for using Speedrunner`;
                  this.emit(":tell", speechOutput);
                });
              });
          } else {
            this.emit(
              ":ask",
              "I couldn't find that category. would you like for me to list the categories?"
            );
          }
        });
    });
  },
  "AMAZON.HelpIntent": function() {
    this.emit(
      ":ask",
      `Speed Runner is a skill to get information on video game records from the speedrun.com API.
      You can ask for games with commands like "Search for Super Mario Odyssey" or listen to specific
      category records like "Look at one hundred percent runs of Super Mario Odyssey". What would you
      like to do?`
    );
  },
  "AMAZON.CancelIntent": function() {
    this.emit(":tell", "Okay. Thanks for using speedrunner");
  },
  "AMAZON.StopIntent": function() {
    this.emit(":tell", "Okay. Thanks for using speedrunner");
  },
  SessionEndedRequest: function() {
    this.emit(":tell", "Thanks for using speedrunner");
  },
  Unhandled: function() {
    this.emit(":ask", "I didn't get that. say it again.");
  }
};

function getUser(run) {
  if (run.run.players[0].rel == "guest") {
    return new Promise(function(resolve, reject) {
      resolve(run.run.players[0].name);
    });
  } else {
    return fetch(run.run.players[0].uri)
      .then(resp => resp.json())
      .then(json => {
        return json.data.names.international;
      });
  }
}

function times(seconds) {
  let secondsRounded = Math.floor(seconds);
  let hours = Math.floor(secondsRounded / 3600);
  let minutes = Math.floor((secondsRounded - hours * 3600) / 60);
  let secondsLeft = secondsRounded - hours * 3600 - minutes * 60;

  let hoursWording = hours == 1 ? "hour" : "hours";
  let minutesWording = minutes == 1 ? "minute" : "minutes";
  let secondsWording = seconds == 1 ? "second" : "seconds";

  if (hours == 0) {
    // Ex: 1 minute, and 20 seconds
    let retStr = `${minutes} ${minutesWording}, and ${secondsLeft} ${secondsWording}`;
    return retStr;
  } else if (hours == 0 && minutes == 0) {
    // Ex: 30 seconds
    let retStr = `${secondsLeft} ${secondsWording}`;
    return retStr;
  } else {
    // Ex: 2 hours, 40 minutes, and 30 seconds
    let retStr = `${hours} ${hoursWording}, ${minutes} ${minutesWording}, and ${secondsLeft} ${secondsWording}`;
    return retStr;
  }
}

function getRecords(category) {
  return fetch(state["categories"][category].url)
    .then(resp => resp.json())
    .then(json => {
      return json.data[0].runs.slice(0, 3).reverse();
    });
}

function getCategories() {
  return fetch(`https://speedrun.com/api/v1/games/${state["game"]}/categories`)
    .then(resp => resp.json())
    .then(json => {
      return json.data.map(category => {
        return {
          name: category.name,
          url: category.links[3].uri
        };
      });
    });
}

function getGameData(game) {
  return fetch(`https://speedrun.com/api/v1/games?name=${encodeURI(game)}`)
    .then(resp => resp.json())
    .then(json => {
      return json.data[0];
    });
}

exports.handler = function(event, context, callback) {
  var alexa = Alexa.handler(event, context, callback);
  alexa.appId = APP_ID;
  alexa.registerHandlers(handlers);
  alexa.execute();
};
