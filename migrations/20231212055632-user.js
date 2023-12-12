exports.up = function (db, callback) {
  db.addColumn('notifications', 'sender_name', {
    type: 'string',
    length: 40
  }, function (err) {
    if (err) return callback(err);
    return callback();
    // db.addColumn('notifications', 'notification_text', {
    //   type: 'text'
    // }, function(err) {
    //   if (err) return callback(err);

    //   // If there are more columns to add, you can continue the pattern

    //   return callback();
    // });
  });
};

exports.down = function (db, callback) {
  db.removeColumn('notifications', 'sender_name', function (err) {
    if (err) return callback(err);
    return callback();

    // db.removeColumn('notifications', 'notification_text', function(err) {
    //   if (err) return callback(err);

    //   // If there are more columns to remove, you can continue the pattern

    //   return callback();
    // });
  });
};