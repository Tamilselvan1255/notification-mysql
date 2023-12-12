exports.up = function (db, callback) {
  // Rename column from 'linkto' to 'link'
  db.renameColumn('notifications', 'linkto', 'link', function (err) {
    if (err) return callback(err);
    return callback();
  });
};

exports.down = function (db, callback) {
  // Revert the column name from 'link' to 'linkto'
  db.renameColumn('notifications', 'link', 'linkto', function (err) {
    if (err) return callback(err);
    return callback();
  });
};
