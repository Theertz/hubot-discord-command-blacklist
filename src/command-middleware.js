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
      const id                = context.listener.options.id;
      const room              = robot.client.channels.find('id', context.response.envelope.room);
      const hubot_user        = context.response.envelope.user;
      const respondInChannel  = robot.brain.get(`data.commandBlacklists${room.id}.replyInRoom`) || false;
      const blacklist         = robot.brain.get(`data.commandBlacklists${room.id}`) || [];
      const override          = robot.brain.get(`data.commandBlacklists${room.id}.override`) || false;
      robot.client.fetchUser(hubot_user.id)
        .then((user) =>{
          const userIsOwner = user.id === owner;
          const userHasPerm = room !== null ? 
          (room.type    === 'text') 
          || room.type  === 'dm' 
          || userIsOwner
           : userIsOwner;
          if ((blacklist.indexOf(id) !== -1 && !(override && userHasPerm)) && !userIsOwner) {
            if (respondInChannel) {
              context.response.send(`Sorry, ${user} you aren't allowed to run that command in ${room}`);
            }
            done();
          } else {
            next(done);
          }
      })
      .catch((error) => console.error(`${error}, command-middleware.js: line ${error.lineNumber}`));
    } else {
      next(done);
    }
  });
}
