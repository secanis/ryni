#!/usr/bin/env python3
"""Check that helm/ryni/values.schema.json describes every key in values.yaml.

Artifact Hub renders the chart's values table from `values.schema.json`, so a
key that exists in `values.yaml` but not in the schema is invisible to users.
Helm cannot catch that (the schema is permissive by design), so this script
does it: it renders the chart's values to JSON (via a throwaway chart with a
single `{{ .Values | toJson }}` template, which needs no YAML parser) and
walks every leaf, asserting the schema has a matching path and a matching
`default` where one is declared.

Usage: python3 scripts/check-values-schema.py [CHART_DIR]
Exit code 1 (with one line per problem) when the schema has drifted.
"""

import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

DUMP_TEMPLATE = "{{ .Values | toJson }}\n"


def render_values(chart_dir: pathlib.Path) -> dict:
    """Return the chart's values.yaml as a dict, parsed by Helm itself."""
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = pathlib.Path(tmp)
        (tmp_dir / "Chart.yaml").write_text(
            "apiVersion: v2\nname: values-dump\nversion: 0.0.0\n"
        )
        shutil.copy(chart_dir / "values.yaml", tmp_dir / "values.yaml")
        (tmp_dir / "templates").mkdir()
        (tmp_dir / "templates" / "dump.yaml").write_text(DUMP_TEMPLATE)

        out = subprocess.run(
            ["helm", "template", "values-dump", str(tmp_dir)],
            capture_output=True,
            text=True,
            check=True,
        ).stdout

    for line in out.splitlines():
        line = line.strip()
        if line.startswith("{"):
            return json.loads(line)
    raise SystemExit("could not find the rendered values JSON in helm's output")


def walk(values, schema, path, problems):
    """Assert `values` is described by `schema`; append problems to `problems`."""
    if isinstance(values, dict):
        if "additionalProperties" in schema:
            # A free-form map (e.g. ingress.annotations): keys are user data,
            # not part of the chart's contract — only the value shape matters.
            return
        properties = schema.get("properties")
        if properties is None:
            # Free-form object block (e.g. networkPolicy.pocketbase.extraFrom
            # items): nothing to enumerate.
            return
        for key, node in values.items():
            if key not in properties:
                problems.append(f"missing schema path: {join(path, key)}")
                continue
            walk(node, properties[key], join(path, key), problems)
        return

    if isinstance(values, list):
        items = schema.get("items")
        if items is None:
            problems.append(f"missing schema items: {path}[]")
            return
        for index, node in enumerate(values):
            walk(node, items, f"{path}[{index}]", problems)
        return

    if "default" in schema and values != schema["default"]:
        problems.append(
            f"default mismatch at {path}: values.yaml={values!r} schema={schema['default']!r}"
        )


def join(path: str, key: str) -> str:
    return f"{path}.{key}" if path else key


def main() -> int:
    chart_dir = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "helm/ryni")
    values = render_values(chart_dir)
    schema = json.loads((chart_dir / "values.schema.json").read_text())

    problems: list[str] = []
    walk(values, schema, "", problems)

    if problems:
        for problem in problems:
            print(problem)
        print(f"values.schema.json is out of sync with values.yaml ({len(problems)} problem(s))")
        return 1

    print("values schema is in sync with values.yaml")
    return 0


if __name__ == "__main__":
    sys.exit(main())
