// Description:
//   Middleware to prevent certain commands to be run in certain rooms
//
module.exports = function(robot) {
  robot.listenerMiddleware(function(context, next, done){
    if(context.response.message.text) {
        var id = context.listener.options.id;
        var room = context.response.envelope.room;
        var user = context.response.envelope.user;
        var discRoom = robot.client.channels.get(room);
      
        var respondInChannel = robot.brain.get('data.commandBlacklists'+room+'.replyInRoom') || false;
        var blacklist = robot.brain.get('data.commandBlacklists'+room) || [];
        var override = robot.brain.get('data.commandBlacklists'+room+'.override') || false;
        var userHasPerm = discRoom != null ?  discRoom.permissionsOf(user.id).hasPermission("managePermissions") : true;
      
        if (blacklist.indexOf(id) !== -1 && !(override && userHasPerm) ) {
          if(respondInChannel){
            context.response.send("Sorry,<@"+user.id+"> you aren't allowed to run that command in <#" + room + ">");
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
