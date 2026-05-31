"""FORGE-MIX wire contract — the ONE definition of the solver request/response shapes.

Mirrors planning/04_contracts.md §S1-S4 EXACTLY: snake_case on the wire, discriminated
union on `mode`. The frontend's types/contract.ts mirrors this 1:1 with no mapping layer.
Any contract change updates 04 §S5 first, then this file AND contract.ts together.
"""
from __future__ import annotations

from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field

# ── enums ──────────────────────────────────────────────────────────
MaterialClass = Literal["CF_NYLON", "PLA", "PETG"]  # demo uses CF_NYLON
Mode = Literal["build", "repair"]

# the single headline reason for the answer's shape (precedence rule, 04 §S4)
BindingReason = Literal[
    "FEEDSTOCK", "HOURS", "ENERGY",         # a budget limited coverage / feasibility
    "RANGE", "PAYLOAD", "WIND",             # an exclusion gate forced the chosen tier
    "MATERIAL", "ENVELOPE", "COMPONENTS",   # a hard node gate blocked the build
    "MISSION_COVERED",                      # fully covered, budget to spare
]

# why a specific tier can't service a specific target (per-tier hover text)
ExclusionReason = Literal["RANGE", "PAYLOAD", "WIND", "MATERIAL", "ENVELOPE", "COMPONENTS"]


# ── shared objects ─────────────────────────────────────────────────
class Budget(BaseModel):
    feedstock_g: dict[MaterialClass, float]  # by class; a class present & >0 = "on hand"
    printer_hours: float
    energy_wh: float


class PrinterEnvelopeMm(BaseModel):
    x: float
    y: float
    z: float


class Node(BaseModel):
    printer_envelope_mm: PrinterEnvelopeMm
    components_on_hand: dict[str, bool]  # keyed by tier_id / item_id — binary kit gate (F5)


class SolveRequestBase(BaseModel):
    budget: Budget
    node: Node
    deposition_rate_g_per_hr: float  # global editable rate; hours = feedstock_g ÷ rate (D4)


class SolveResponseBase(BaseModel):
    feasible: bool          # false ⇒ CANNOT BUILD
    headline: str           # "BUILD 5× SCOUT-S" | "CANNOT BUILD TONIGHT — recommend resupply"
    binding_reason: BindingReason
    budget_total: Budget    # echo of request budget
    budget_used: Budget     # consumed by the chosen build


# ── BUILD — request + response (04 §S2) ────────────────────────────
class Tier(BaseModel):
    id: str                 # "SCOUT_S" | "ISR_M" | "STRIKE_L"
    name: str
    role: str
    material_class: MaterialClass
    feedstock_g: float      # printed structural mass            [SEEDED]
    energy_wh: float        #                                    [SEEDED·CITED]
    payload_cap_g: float
    range_km: float
    wind_kt: float
    envelope_max_mm: float  # largest single printed dimension   [SEEDED]
    mtow_g: float           # reference/display only


class Target(BaseModel):
    id: str
    standoff_km: float
    payload_g: float
    weather_kt: float
    value: float            # priority — soft = 1, HVT = 10      [SEEDED]


class BuildRequest(SolveRequestBase):
    mode: Literal["build"]
    tiers: list[Tier]
    targets: list[Target]


class UnitCost(BaseModel):
    feedstock_g: float
    printer_hours: float
    energy_wh: float


class TierStatus(BaseModel):
    tier_id: str
    built: int                            # n_t
    derived_hours: float                  # feedstock_g ÷ deposition_rate (solver-computed)
    unit_cost: UnitCost
    eligible_target_ids: list[str]        # targets this tier could service (all gates pass)
    exclusion_reasons: list[ExclusionReason]  # distinct gates excluding it (hover text)


class TargetStatus(BaseModel):
    target_id: str
    covered: bool
    assigned_tier_id: Optional[str]       # the tier servicing it, or None if uncovered


class Coverage(BaseModel):
    covered: int
    total: int


class BuildResult(SolveResponseBase):
    builds: dict[str, int]                # tier_id → n_t  (drives the icon row)
    coverage: Coverage                    # k / M
    covered_value: float
    tier_status: list[TierStatus]
    target_status: list[TargetStatus]     # per-target assignment (the heterogeneous heart)


# ── REPAIR — request + response (04 §S3) ───────────────────────────
class RepairItem(BaseModel):
    id: str                 # NSN format, e.g. "5340-01-234-5678"  [SEEDED: NSN format]
    name: str
    material_class: MaterialClass
    feedstock_g: float
    energy_wh: float
    envelope_max_mm: float
    mission_value: float    # operational-availability restored
    safety_critical: bool   # true ⇒ routed to cant_print_safety regardless of budget


class RepairRequest(SolveRequestBase):
    mode: Literal["repair"]
    items: list[RepairItem]


class RepairBuckets(BaseModel):
    print_now: list[str]          # selected: maximize Σ mission_value s.t. budget + gates
    cant_print_safety: list[str]  # safety_critical or failing a hard gate
    defer: list[str]              # eligible but not selected (budget)


class RepairResult(SolveResponseBase):
    buckets: RepairBuckets
    selected_value: float


# ── the wire envelope — discriminated on `mode` (04 §S4) ────────────
SolveRequest = Annotated[Union[BuildRequest, RepairRequest], Field(discriminator="mode")]
SolveResponse = Union[BuildResult, RepairResult]
# Endpoint: POST /solve  (Content-Type: application/json) → SolveResponse
