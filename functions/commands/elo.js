const lib = require('lib')({token: process.env.STDLIB_TOKEN});
const storage = require('../../helpers/storage.js');
function formatTeamKey(teamId) {
  return `SLACK::${process.env.SLACK_APP_NAME}::${teamId}`;
};
/**
* /hello
*
*   Basic "Hello World" command.
*   All Commands use this template, simply create additional files with
*   different names to add commands.
*
*   See https://api.slack.com/slash-commands for more details.
*
* @param {string} user The user id of the user that invoked this command (name is usable as well)
* @param {string} channel The channel id the command was executed in (name is usable as well)
* @param {string} text The text contents of the command
* @param {object} command The full Slack command object
* @param {string} botToken The bot token for the Slack bot you have activated
* @returns {object}
*/
module.exports = (user, channel, text = '', command = {}, botToken = null, context, callback) => {
  if (text.split(' ')[0] == '') {
    lib.utils.storage.get(formatTeamKey(command.team_id), (err, value) => {
      if (!err) {
        if (!('elo' in value)) {
          value.elo = {};
        }
        if (!(command.user_name in value.elo)) {
          value.elo[command.user_name] = 1200;
        }
        callback(err, {
          text: '@' + command.user_name + '\'s Rating: ' + Math.floor(value.elo[command.user_name]) + '.',
          link_names: 1,
          parse: 'full'
        })
      }
    });
    return;
  }
  var opponent_name = text.split(' ')[0].slice(1);
  let sA = 0;
  let actionWord = 0;
  if (text.split(' ')[1] == 'loss') {
    sA = 0
    actionWord = "lost"
  } else if (text.split(' ')[1] == 'tie') {
    sA = 0.5
    actionWord = "tied"
  } else {
    actionWord = "won"
    sA = 1
  }
  // todo - many types of checks
  lib.utils.storage.get(formatTeamKey(command.team_id), (err, value) => {
    if (!err) {
      if (!('elo' in value)) {
        value.elo = {};
      }
      if (!(command.user_name in value.elo)) {
        value.elo[command.user_name] = 1200;
      }

      if (!(opponent_name in value.elo)) {
        value.elo[opponent_name] = 1200;
      }

      let k = 16
      var rA = value.elo[command.user_name]
      var rB = value.elo[opponent_name]
      let qA = 10 ** (rA / 400)
      let qB = 10 ** (rB / 400)
      let eA = qA / (qA + qB)
      let eB = qB / (qA + qB)
      var newA = rA + k * (sA - eA)
      var newB = rB + k * (1 - sA - eB)

      value.elo[command.user_name] = newA
      value.elo[opponent_name] = newB

    }
    lib.utils.storage.set(formatTeamKey(command.team_id), value, (err, value) => {
      callback(err, {
        text: '@' + command.user_name + ' (' + Math.floor(rA) + '>' + Math.floor(newA) + ') ' +
          actionWord + ' against @' + opponent_name + ' (' + Math.floor(rB) + '>' + Math.floor(newB) + ').',
        link_names: 1,
        parse: 'full'
      });
    });
  });

};
