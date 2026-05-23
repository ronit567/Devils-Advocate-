import json
import random
from pathlib import Path
from models import Persona

_PERSONAS_PATH = Path(__file__).parent / "personas" / "default_pack.json"
_CUSTOM_PATH = Path(__file__).parent / "personas" / "custom_pack.json"

# Alternate first names used to spin up variants when we need more participants than the base pack provides.
# Kept gender/ethnicity-diverse so the focus group doesn't sound homogeneous.
_VARIANT_NAMES = [
    "Alex", "Becky", "Carlos", "Dana", "Ellis", "Farah", "Gus", "Hana", "Imani", "Jules",
    "Kai", "Lupe", "Mei", "Noah", "Owen", "Priya", "Quinn", "Rosa", "Sami", "Theo",
    "Uma", "Vik", "Wendy", "Xochitl", "Yara", "Zane", "Brielle", "Cole", "Deja", "Eli",
    "Felipe", "Gemma", "Holden", "Ivy", "Jamal", "Kira", "Leo", "Maya", "Nate", "Olive",
]


def load_default_personas() -> list[Persona]:
    with open(_PERSONAS_PATH) as f:
        data = json.load(f)
    return [Persona(**p) for p in data]


def load_custom_personas() -> list[Persona]:
    if not _CUSTOM_PATH.exists():
        return []
    try:
        with open(_CUSTOM_PATH) as f:
            data = json.load(f)
        return [Persona(**p) for p in data]
    except Exception:
        return []


def save_custom_personas(personas: list[Persona]) -> None:
    with open(_CUSTOM_PATH, "w") as f:
        json.dump([p.model_dump() for p in personas], f, indent=2)


def load_all_personas() -> list[Persona]:
    return load_default_personas() + load_custom_personas()


def _make_variant(base: Persona, variant_idx: int, used_names: set[str]) -> Persona:
    """Spin up a fresh-feeling persona by reusing a base's archetype/style but changing the surface details."""
    # Pick a name not already used in this session
    candidates = [n for n in _VARIANT_NAMES if n not in used_names]
    if not candidates:
        candidates = _VARIANT_NAMES
    new_name = random.choice(candidates)
    used_names.add(new_name)

    age_shift = random.choice([-6, -4, -3, 3, 4, 6, 8])
    new_age = max(19, min(70, base.age + age_shift))

    data = base.model_dump()
    data["id"] = f"{base.id}_v{variant_idx}_{new_name.lower()}"
    data["name"] = new_name
    data["age"] = new_age
    return Persona(**data)


def select_personas(n: int) -> list[Persona]:
    all_personas = load_all_personas()
    if n <= len(all_personas):
        return _select_with_archetype_diversity(all_personas, n)

    # Use every base persona once, then fill the remainder with variants.
    selected = list(all_personas)
    used_names = {p.name for p in selected}
    needed = n - len(selected)

    # Cycle through bases so variants are spread across archetypes
    bases = list(all_personas)
    random.shuffle(bases)
    for i in range(needed):
        base = bases[i % len(bases)]
        selected.append(_make_variant(base, variant_idx=i, used_names=used_names))

    return selected


def _select_with_archetype_diversity(all_personas: list[Persona], n: int) -> list[Persona]:
    """When the request fits in the base pool, ensure archetype variety by round-robin selection."""
    by_archetype: dict[str, list[Persona]] = {}
    for p in all_personas:
        by_archetype.setdefault(p.archetype, []).append(p)

    selected: list[Persona] = []
    archetypes = list(by_archetype.keys())
    random.shuffle(archetypes)

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
