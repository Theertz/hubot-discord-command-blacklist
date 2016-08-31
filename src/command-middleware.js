// Description:
//   Middleware to prevent certain commands to be run in certain rooms
//
var silentMode = process.env.HUBOT_BLACKLIST_SILENCE_RESPONSES || false;
module.exports = function(robot) {
  robot.listenerMiddleware(function(context, next, done){
    if(context.response.message.text) {
        var id = context.listener.options.id;
        var room = context.response.envelope.room;
        var blacklist = robot.brain.get('data.commandBlacklists'+room) || [];
        if (blacklist.indexOf(id) !== -1) {
          if(!silentMode){
            context.response.reply("Sorry you aren't allowed to run that command in " + room);
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
