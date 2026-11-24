#!/usr/bin/env python3
"""Check that helm/ryni/values.schema.json keeps in sync with values.yaml.

Artifact Hub renders the chart's values table from `values.schema.json`, so a
key that exists in `values.yaml` but not in the schema is invisible to users,
and a key in the schema that the chart never reads advertises a knob that does
nothing. Helm cannot catch either (the schema is deliberately permissive), so
this script does it:

  * `render_values()` asks Helm itself for `values.yaml` as JSON (a throwaway
    chart with a single `{{ .Values | toJson }}` template), so no YAML parser
    is needed.
  * `check()` walks every leaf of those values and asserts the schema has a
    matching path, a matching `default` where one is declared, and no extra
    properties that the chart does not read.
  * `--self-test` proves the walk still catches drift, so the guard cannot
    silently degrade into a no-op.

This is not a type/format validator: `helm lint` (run right before this in
`scripts/test-helm.sh`) is the authoritative validation of values against the
schema. This script only checks that the two files describe the same keys with
the same defaults.

Usage:
  python3 scripts/check-values-schema.py [CHART_DIR]
  python3 scripts/check-values-schema.py --self-test

Exit codes: 0 in sync, 1 drift found, 2 the check could not run.
"""

import copy
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

DUMP_TEMPLATE = "{{ .Values | toJson }}\n"

# Object blocks whose contents are user data rather than chart contract. Paths
# are normalised (`foo[0]` -> `foo[]`). A dict in values.yaml whose schema has
# no `properties` block is a drift error everywhere else, because it means a
# schema section was deleted or mistyped.
FREE_FORM_PATHS = {
    # NetworkPolicy peer objects: passed through to the NetworkPolicy verbatim.
    "networkPolicy.pocketbase.extraFrom[]",
}

INDEX = re.compile(r"\[\d+\]")


def normalise(path: str) -> str:
    return INDEX.sub("[]", path)


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
    raise RuntimeError("could not find the rendered values JSON in helm's output")


def join(path: str, key: str) -> str:
    return f"{path}.{key}" if path else key


def walk(values, schema, path, problems, counter) -> None:
    """Assert `values` is described by `schema`; append problems to `problems`."""
    if "default" in schema and values != schema["default"]:
        problems.append(
            f"default mismatch at {path or '<root>'}: "
            f"values.yaml={values!r} schema={schema['default']!r}"
        )

    if isinstance(values, dict):
        properties = schema.get("properties")
        if properties is None:
            if normalise(path) in FREE_FORM_PATHS:
                return
            if "additionalProperties" in schema:
                # A free-form map (e.g. ingress.annotations): its keys are user
                # data, not chart contract, so there is nothing to enumerate.
                return
            problems.append(
                f"missing schema properties block: {path} "
                "(not a known free-form block)"
            )
            return

        for key, node in values.items():
            if key not in properties:
                problems.append(f"missing schema path: {join(path, key)}")
                continue
            walk(node, properties[key], join(path, key), problems, counter)
        for key in properties:
            if key not in values:
                problems.append(f"unknown schema path: {join(path, key)}")
        return

    if isinstance(values, list):
        items = schema.get("items")
        if items is None:
            problems.append(f"missing schema items: {path}[]")
            return
        for index, node in enumerate(values):
            walk(node, items, f"{path}[{index}]", problems, counter)
        return

    counter["leaves"] += 1


def check(chart_dir: pathlib.Path, schema: dict, values: dict) -> tuple[list[str], int]:
    problems: list[str] = []
    counter = {"leaves": 0}
    walk(values, schema, "", problems, counter)
    return problems, counter["leaves"]


def drop(schema: dict, keys: list[str]) -> None:
    node = schema
    for key in keys[:-1]:
        node = node[key]
    node.pop(keys[-1])


def self_test(chart_dir: pathlib.Path) -> int:
    """Prove the walk still catches the drift shapes it exists for."""
    values = render_values(chart_dir)
    base = json.loads((chart_dir / "values.schema.json").read_text())
    paths = ["properties", "ingress", "properties", "hosts", "items", "properties"]

    def dropped_path(schema: dict) -> None:
        drop(schema, paths + ["paths"])

    def wrong_default(schema: dict) -> None:
        schema["properties"]["frontend"]["properties"]["replicaCount"]["default"] = 9

    def root_additional_properties(schema: dict) -> None:
        schema["additionalProperties"] = False
        dropped_path(schema)

    def dropped_properties(schema: dict) -> None:
        drop(schema, ["properties", "pocketbase", "properties", "image", "properties"])

    def extra_schema_key(schema: dict) -> None:
        schema["properties"]["pocketbase"]["properties"]["supuserIps"] = {
            "type": "string"
        }

    cases = [
        ("unmodified schema is clean", lambda _s: None, None),
        ("dropped array-item property", dropped_path, "missing schema path: ingress.hosts[0].paths"),
        ("wrong default", wrong_default, "default mismatch at frontend.replicaCount"),
        ("root additionalProperties is not an escape hatch", root_additional_properties, "missing schema path"),
        ("dropped nested properties block", dropped_properties, "missing schema properties block: pocketbase.image"),
        ("schema documents a key the chart never reads", extra_schema_key, "unknown schema path: pocketbase.supuserIps"),
    ]

    failures = 0
    for name, mutate, expected in cases:
        candidate = copy.deepcopy(base)
        mutate(candidate)
        problems, _ = check(chart_dir, candidate, values)
        if expected is None:
            passed = not problems
        else:
            passed = any(expected in problem for problem in problems)
        print(f"{'ok' if passed else 'FAILED'}: {name}")
        if not passed:
            failures += 1
            for problem in problems:
                print(f"    {problem}")
    if failures:
        print(f"self-test failed ({failures} case(s))")
        return 1
    print(f"self-test passed ({len(cases)} cases)")
    return 0


def main() -> int:
    args = sys.argv[1:]
    chart_dir = pathlib.Path("helm/ryni")
    positional = [arg for arg in args if not arg.startswith("-")]
    if positional:
        chart_dir = pathlib.Path(positional[0])

    try:
        values = render_values(chart_dir)
    except (OSError, subprocess.CalledProcessError, RuntimeError) as error:
        print(f"could not read {chart_dir}/values.yaml via helm: {error}")
        return 2

    if "--self-test" in args:
        return self_test(chart_dir)

    schema = json.loads((chart_dir / "values.schema.json").read_text())
    problems, leaves = check(chart_dir, schema, values)

    if problems:
        for problem in problems:
            print(problem)
        print(
            f"values.schema.json is out of sync with values.yaml "
            f"({len(problems)} problem(s))"
        )
        return 1

    print(f"values schema is in sync with values.yaml ({leaves} leaves checked)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
