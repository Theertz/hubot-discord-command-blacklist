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
      var room = context.response.envelope.room;
      var user = context.response.envelope.user;
      
      var respondInChannel = robot.brain.get('data.commandBlacklists' + room + '.replyInRoom') || false;
      var blacklist = robot.brain.get('data.commandBlacklists' + room) || [];
      var override = robot.brain.get('data.commandBlacklists' + room + '.override') || false;
      
      var discRoom = robot.client.channels.get(room);
      var discPermExists = discRoom != null ? discRoom.permissionsOf(user.id).hasPermission("managePermissions") : false;
      var userIsOwner = user.id === owner;
      var userHasPerm = discPermExists ? true : userIsOwner;

      if (blacklist.indexOf(id) !== -1 && !(override && userHasPerm)) {
        if (respondInChannel) {
          context.response.send("Sorry,<@" + user.id + "> you aren't allowed to run that command in <#" + room + ">");
        }
        done();
      } else {
        next(done);
      }
    } else {
      next(done);
    }
  });
}