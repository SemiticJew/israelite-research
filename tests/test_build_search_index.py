"""Regression tests for tools/build_search_index.py.

Run: python3 -m unittest discover -s tests -p "test_build_search_index.py" -v
"""
import importlib.util
import io
import json
import shutil
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("build_search_index", REPO / "tools" / "build_search_index.py")


def load_builder():
    mod = importlib.util.module_from_spec(SPEC)
    SPEC.loader.exec_module(mod)
    return mod


def page(title, description, date="2026-01-01", keywords=""):
    kw = f'<meta name="keywords" content="{keywords}">' if keywords else ""
    return (f'<html><head><title>{title}</title><meta name="description" content="{description}">'
            f'<meta property="article:published_time" content="{date}">{kw}</head>'
            f'<body><h1>{title}</h1></body></html>')


class CuratedTagPreservation(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        (self.tmp / "articles").mkdir()
        (self.tmp / "articles" / "old.html").write_text(page("Old Logic Article", "About logic and law."))
        (self.tmp / "articles" / "new.html").write_text(page("New Prophecy Article", "On prophecy.", "2026-02-02"))
        self.out = self.tmp / "search-index.json"

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def run_builder(self, *extra):
        mod = load_builder()
        with redirect_stdout(io.StringIO()):
            mod.main(["--root", str(self.tmp), "--out", str(self.out), *extra])
        return {d["url"]: d for d in json.loads(self.out.read_text())}

    def test_curated_tags_survive_verbatim_and_new_pages_get_generated_tags(self):
        curated = ["history", "nations", "justice"]  # deliberately unsorted / not derivable
        self.out.write_text(json.dumps([{"url": "/articles/old.html", "title": "stale", "tags": curated}]))
        idx = self.run_builder()
        self.assertEqual(idx["/articles/old.html"]["tags"], curated)
        self.assertEqual(idx["/articles/old.html"]["title"], "Old Logic Article")  # metadata still refreshes
        self.assertIn("prophecy", idx["/articles/new.html"]["tags"])

    def test_empty_curated_tag_list_is_respected(self):
        self.out.write_text(json.dumps([{"url": "/articles/old.html", "tags": []}]))
        self.assertEqual(self.run_builder()["/articles/old.html"]["tags"], [])

    def test_existing_flag_reads_tags_from_another_file(self):
        prior = self.tmp / "prior.json"
        prior.write_text(json.dumps([{"url": "/articles/old.html", "tags": ["kept"]}]))
        self.assertEqual(self.run_builder("--existing", str(prior))["/articles/old.html"]["tags"], ["kept"])

    def test_unreadable_existing_index_aborts_without_overwriting(self):
        self.out.write_text("{ not json")
        with self.assertRaises(SystemExit):
            self.run_builder()
        self.assertEqual(self.out.read_text(), "{ not json")

    def test_large_drop_in_records_aborts(self):
        self.out.write_text(json.dumps([{"url": f"/articles/gone-{i}.html", "tags": []} for i in range(10)]))
        before = self.out.read_text()
        with self.assertRaises(SystemExit):
            self.run_builder()
        self.assertEqual(self.out.read_text(), before)


class RealRepositoryIndex(unittest.TestCase):
    """Rebuilding the real site must keep every curated tag in the committed index."""

    def test_every_committed_tag_list_survives_a_rebuild(self):
        committed = json.loads((REPO / "search-index.json").read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "search-index.json"
            mod = load_builder()
            with redirect_stdout(io.StringIO()):
                mod.main(["--root", str(REPO), "--out", str(out), "--existing", str(REPO / "search-index.json")])
            rebuilt = {d["url"]: d["tags"] for d in json.loads(out.read_text(encoding="utf-8"))}
        for item in committed:
            with self.subTest(url=item["url"]):
                self.assertIn(item["url"], rebuilt)
                self.assertEqual(rebuilt[item["url"]], item["tags"])


if __name__ == "__main__":
    unittest.main()
