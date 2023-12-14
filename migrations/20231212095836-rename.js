exports.up = function (db, callback) {
  // Rename column from 'linkto' to 'link'
  db.renameColumn('notifications', 'linkto', 'link', function (err) {
    if (err) return callback(err);

    // Add a new column 'emoji' to the 'notifications' table
    db.addColumn('notifications', 'emoji', { type: 'string', defaultValue: null }, function (err) {
      if (err) return callback(err);
      return callback();
    });
  });
};

exports.down = function (db, callback) {
  // Remove the 'emoji' column from the 'notifications' table
  db.removeColumn('notifications', 'emoji', function (err) {
    if (err) return callback(err);

    // Revert the column name from 'link' to 'linkto'
    db.renameColumn('notifications', 'link', 'linkto', function (err) {
      if (err) return callback(err);
      return callback();
    });
  });
};
