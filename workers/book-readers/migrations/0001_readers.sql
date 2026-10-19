CREATE TABLE IF NOT EXISTS readers (
 email TEXT PRIMARY KEY,
 ebook INTEGER NOT NULL CHECK(ebook IN (0,1)),
 paperback INTEGER NOT NULL CHECK(paperback IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 consent_version TEXT NOT NULL DEFAULT 'book-launch-v1'
);
CREATE TABLE IF NOT EXISTS totals (id INTEGER PRIMARY KEY CHECK(id=1), total INTEGER NOT NULL, ebook INTEGER NOT NULL, paperback INTEGER NOT NULL);
INSERT OR IGNORE INTO totals VALUES(1,0,0,0);
CREATE TRIGGER IF NOT EXISTS reader_insert AFTER INSERT ON readers BEGIN
 UPDATE totals SET total=total+1,ebook=ebook+NEW.ebook,paperback=paperback+NEW.paperback WHERE id=1;
END;
CREATE TRIGGER IF NOT EXISTS reader_delete AFTER DELETE ON readers BEGIN
 UPDATE totals SET total=total-1,ebook=ebook-OLD.ebook,paperback=paperback-OLD.paperback WHERE id=1;
END;
