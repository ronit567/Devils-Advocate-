import json
import random
from pathlib import Path
from models import Persona

_PERSONAS_PATH = Path(__file__).parent / "personas" / "default_pack.json"


def load_all_personas() -> list[Persona]:
    with open(_PERSONAS_PATH) as f:
        data = json.load(f)
    return [Persona(**p) for p in data]


def select_personas(n: int) -> list[Persona]:
    all_personas = load_all_personas()
    n = min(n, len(all_personas))

    # Ensure archetype diversity: group by archetype, pick at least one from each
    by_archetype: dict[str, list[Persona]] = {}
    for p in all_personas:
        by_archetype.setdefault(p.archetype, []).append(p)

    selected: list[Persona] = []
    archetypes = list(by_archetype.keys())
    random.shuffle(archetypes)

    # Round-robin across archetypes until we hit n
    i = 0
    while len(selected) < n:
        archetype = archetypes[i % len(archetypes)]
        pool = [p for p in by_archetype[archetype] if p not in selected]
        if pool:
            selected.append(random.choice(pool))
        i += 1
        if i > len(all_personas) * 2:
            break

    return selected[:n]
