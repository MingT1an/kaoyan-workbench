const { app } = require('electron')

app.whenReady().then(() => {
  try {
    const Database = require('better-sqlite3')
    const db = new Database(':memory:')
    db.exec('CREATE TABLE t (a INTEGER)')
    db.prepare('INSERT INTO t VALUES (?)').run(42)
    const row = db.prepare('SELECT a FROM t').get()
    if (row.a !== 42) throw new Error('unexpected row value')
    console.log(
      `SQLITE_OK electron=${process.versions.electron} node=${process.versions.node} abi=${process.versions.modules}`
    )
    app.exit(0)
  } catch (err) {
    console.error('SQLITE_FAIL', err)
    app.exit(1)
  }
})
