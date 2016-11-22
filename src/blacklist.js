//  Description:
//   Sets the permissions for commands in a room
//
// Configuration:
//   HUBOT_DEFAULT_COMMANDS - comma seperated list of command ids that can't be disabled.
//   HUBOT_OWNER - Id of the owner of the bot - allows full access to commands
//
// Commands:
//   hubot enable/disable <commandId> - Enable/disable this command in the current room
//   hubot enable/disable all - Enable/disable all commands in the current room
//   hubot list commands - Displays all commands for a room sorted into enabled and disabled
//   hubot toggle response - Toggle hubot responding in this channel to blacklist commands
//   hubot toggle override - Toggel hubot allowing an admin user to override the blacklist and call commands that are disabled
//
// Author:
//   Matej Voboril <matej@voboril.org>
     
module.exports = function(robot) {
  var defaults = ['room.enable', 'room.list-commands', 'room.disable', 'room.toggle-reponse', 'room.toggle-override'];
  var owner = process.env.HUBOT_OWNER || '';
  if(process.env.HUBOT_DEFAULT_COMMANDS){
    var split = process.env.HUBOT_DEFAULT_COMMANDS.split(',');
    robot.brain.set('data.defaultCommands', split);
    defaults = defaults.concat(split);
  } else {
    robot.brain.set('data.defaultCommands', defaults);
  }

  robot.respond(/enable (.*)/i, {id: 'room.enable'}, function(msg) {
    const room = robot.client.channels.find('id', msg.message.room);
    robot.client.fetchUser(msg.envelope.user.id)
      .then((user) => {
      const userHasPerm = room !== null ? 
          (room.type    === 'text' && room.permissionsFor(user).hasPermission("MANAGE_ROLES_OR_PERMISSIONS")) 
          || room.type  === 'dm' 
          || user.id    === owner 
           : user.id    === owner;
      const respondInChannel = robot.brain.get(`data.commandBlacklists${room.id}.replyInRoom`) || false;
      if(userHasPerm) {
        var commandId = msg.match[1];
        var commandBlacklists = robot.brain.get(`data.commandBlacklists${room.id}`) || user.id === owner || [];
        var index = commandBlacklists.indexOf(commandId);
        var commands = robot.listeners.reduce(function(prev, l){
          if(l.options.id) {
            prev.push(l.options.id);
          }
          return prev;
        }, []);

        if(commandId === 'all'){
          commandBlacklists = [];
          robot.brain.set(`data.commandBlacklists${room.id}`, commandBlacklists);
          if(respondInChannel) {
            msg.send(`All commands enabled in ${room}`);
          } else {
            robot.logger.debug(`All commands enabled in ${room}`);
          }
        } else if(commands.indexOf(commandId) === -1){
          if(respondInChannel){
            msg.send(`${commandId} is not an available command.  run \`list commands\` to see the list.`);
          }
        } else if(index === -1){
          if(respondInChannel){msg.send(`${commandId} is already enabled in #{room}.`);} 
        } else {
          commandBlacklists.splice(index, 1);
          robot.brain.set(`data.commandBlacklists${room.id}`, commandBlacklists)
          if(respondInChannel){
            msg.send(`${commandId} is enabled in ${room}.`);
          } else {
            robot.logger.debug(`${commandId} is enabled in ${room}.`);
          }
        }
      } else {
        if(respondInChannel)
          msg.send("Only users with 'MANAGE_ROLES_OR_PERMISSIONS' can enable commands");
      }
    })
    .catch((error) => console.error(`${error}, blacklist.js: line 75`));
  });

  robot.respond(/disable (.*)/i, {id: 'room.disable'}, function(msg) {
    var room = robot.client.channels.find('id', msg.message.room);
    robot.client.fetchUser(msg.envelope.user.id)
      .then((user) => {
      const userHasPerm = room !== null ? 
          (room.type    === 'text' && room.permissionsFor(user).hasPermission("MANAGE_ROLES_OR_PERMISSIONS")) 
          || room.type  === 'dm' 
          || user.id    === owner 
           : user.id    === owner;
      var respondInChannel = robot.brain.get(`data.commandBlacklists${room.id}.replyInRoom`) || false;

      if(userHasPerm) {
        var commandId = msg.match[1];
        var commandBlacklists = robot.brain.get(`data.commandBlacklists${room.id}`) || [];
        var index = commandBlacklists.indexOf(commandId);
        var commands = robot.listeners.reduce(function(prev, l){
          if(l.options.id && defaults.indexOf(l.options.id) === -1) {
            prev.push(l.options.id);
          }
          return prev;
        }, []);

        if(commandId === 'all'){
          commandBlacklists = commands;
          robot.brain.set(`data.commandBlacklists${room.id}`, commandBlacklists);
          if(respondInChannel){
            msg.send(`All commands disabled in ${room}`);
          } else {
            robot.logger.debug(`All commands disabled in ${room}`);
          }
        } else if(index !== -1){
          if(respondInChannel)
            msg.send(`${commandId} is already disabled in ${room}`);
        } else if(defaults.indexOf(commandId) !== -1){
          if(respondInChannel)
            msg.send("Why on earth would you want to disable this command? Stahp.")
        } else if(commands.indexOf(commandId) === -1) {
          if(respondInChannel)
            msg.send(`${commandId} is not an available command.  run \`list commands\` to see the list.`);
        } else {
          commandBlacklists.push(commandId);
          robot.brain.set(`data.commandBlacklists${room.id}`, commandBlacklists)
          if(respondInChannel){
            msg.send(`${commandId} is disabled in ${room}`);
          } else {
            robot.logger.debug(`${commandId} is disabled in ${room}`);
          }
        }
      } else {
        if(respondInChannel)
          msg.send("Only users with 'MANAGE_ROLES_OR_PERMISSIONS' can disable commands.");
      }
    })
    .catch((error) => console.error(`${error}, blacklist.js: line 127`));
  });

  robot.respond(/list\s?commands?/i, {id: 'room.list-commands'}, function(msg) {
    var room = robot.client.channels.find('id', msg.message.room);
    var commandBlacklist = robot.brain.get(`data.commandBlacklists${room.id}`) || [];
    var respondInChannel = robot.brain.get(`data.commandBlacklists${room.id}.replyInRoom`) || false;
    var disabled = commandBlacklist || [];
    var enabled = robot.listeners.reduce(function(prev, listener){
      if(disabled.indexOf(listener.options.id) === -1){
        if(listener.options.id) {
          prev.push(listener.options.id);
        }
      }
      return prev;
    }, []);

    var message = `*Enabled Commands in ${room}*\n`;
    message += enabled.join('\n');
    message += `\n\n*Disabled Commands in ${room}*\n`;
    message += disabled.join('\n');

    if(respondInChannel)
      msg.send(message);
  });
  
  robot.respond(/toggle\s?Response/i, {id: 'room.toggle-reponse'}, function(msg) {
    var room = robot.client.channels.find('id', msg.message.room);
    robot.client.fetchUser(msg.envelope.user.id)
      .then((user) => {
      const userHasPerm = room !== null ? 
          (room.type    === 'text' && room.permissionsFor(user).hasPermission("MANAGE_ROLES_OR_PERMISSIONS")) 
          || room.type  === 'dm' 
          || user.id    === owner 
           : user.id    === owner;
      var respondInChannel = robot.brain.get(`data.commandBlacklists${room.id}.replyInRoom`) || false;
      if(userHasPerm) {
        robot.brain.set(`data.commandBlacklists${room.id}.replyInRoom`, !respondInChannel);
        if(respondInChannel){
          var respondSettingStr = + !respondInChannel ? "on" : "off";
          msg.send(`Responding is now ${respondSettingStr} in  ${room}`)
        }
      } else {
        if(respondInChannel){
          msg.send(`Only users with 'MANAGE_ROLES_OR_PERMISSIONS' can toggle responding in  ${room}`)
        }
      }
    })
    .catch((error) => console.error(`${error}, blacklist.js: line 172`));
  });
  
  robot.respond(/toggle\s?override/i, {id: 'room.toggle-override'}, function(msg) {
    var room = robot.client.channels.find('id', msg.message.room);
    robot.client.fetchUser(msg.envelope.user.id)
      .then((user) => {
        const userIsOwner = user.id === owner;
        const userHasPerm = room !== null ? 
            (room.type    === 'text' && room.permissionsFor(user).hasPermission("MANAGE_ROLES_OR_PERMISSIONS")) 
            || room.type  === 'dm' 
            || userIsOwner 
             : false;
        if(room !== null){
          var respondInChannel = robot.brain.get(`data.commandBlacklists${room.id}.replyInRoom`) || false;
          var override = robot.brain.get(`data.commandBlacklists${room.id}.override`) || false;

          if(userHasPerm || userIsOwner) {
            robot.brain.set('data.commandBlacklists'+room+'.override', !override);
            if(respondInChannel){
               var overrideSettingString = + !override ? "on" : "off";
              msg.send(`Override is now ${overrideSettingString} in ${room}.`)
            }
          } else {
            if(respondInChannel){
              msg.send(`Only users with 'MANAGE_ROLES_OR_PERMISSIONS' can toggle override in  ${room}`)
            }
          }
        }
      })
      .catch((error) => console.error(`${error}, blacklist.js: line 196`));
  });
}
