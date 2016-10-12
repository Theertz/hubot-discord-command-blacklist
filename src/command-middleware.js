// Description:
//   Middleware to prevent certain commands to be run in certain rooms
//
// Configuration:
//   HUBOT_DEFAULT_COMMANDS - comma seperated list of command ids that can't be disabled.
//   HUBOT_OWNER - Id of the owner of the bot - allows full access to commands

module.exports = function (robot) {
  var owner = process.env.HUBOT_OWNER || '';
  
  robot.listenerMiddleware(function (context, next, done) {
    if (context.response.message.text) {
      var id = context.listener.options.id;
      var room = robot.client.channels.find('id', context.response.envelope.room);
      var hubot_user = context.response.envelope.user;
      
      var respondInChannel = robot.brain.get(`data.commandBlacklists${room.id}.replyInRoom`) || false;
      var blacklist = robot.brain.get(`data.commandBlacklists${room.id}`) || [];
      var override = robot.brain.get(`data.commandBlacklists${room.id}.override`) || false;
      robot.client.fetchUser(hubot_user.id)
        .then((user) =>{
          var userHasPerm = room !== null ? room.permissionsFor(user).hasPermission("MANAGE_ROLES_OR_PERMISSIONS") : user.id === owner;
        
          if (blacklist.indexOf(id) !== -1 && !(override && userHasPerm)) {
            if (respondInChannel) {
              context.response.send(`Sorry, ${user.id} you aren't allowed to run that command in ${room}`);
            }
            done();
          } else {
            next(done);
          }
      })
      .catch((error) => console.error(`${error}, command-middleware.js: line 33`));
    } else {
      next(done);
    }
  });
}