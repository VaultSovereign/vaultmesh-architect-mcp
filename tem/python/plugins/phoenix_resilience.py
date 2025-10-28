"""
Phoenix Resilience Protocol — Tem plugin (Python stub)

Purpose:
  Provide autonomous recovery transitions and canary-friendly logic that
  integrates with a Tem engine. Reads config from YAML and outputs next-phase
  recommendations given Ψ (coherence) and PE (pressure).

Suggested interface in Tem engine:
  - load_config(yaml_path) -> dict
  - plugin = PhoenixResiliencePlugin(config)
  - plugin.next_phase(current_phase, psi, pe) -> phase
  - plugin.on_incident(incident: dict) -> mitigation dict

Phases: "Normal", "Nigredo", "Rubedo"
"""

from __future__ import annotations
import json
from dataclasses import dataclass
from typing import Dict, Any

try:
    import yaml  # type: ignore
except Exception:  # pragma: no cover
    yaml = None


@dataclass
class PhoenixConfig:
    enabled: bool = True
    psi_min: float = 0.21
    pe_max: float = 2.4
    rubedo_growth: float = 1.618
    pressure_discharge: float = 0.7
    rubedo_cycles: int = 8
    stabilization_cycles: int = 13
    phi_modulation: bool = True
    fibonacci_cadence: bool = True


def load_config(yaml_path: str) -> PhoenixConfig:
    if yaml is None:
        raise RuntimeError("PyYAML not installed; pip install pyyaml")
    with open(yaml_path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}
    pr = raw.get("phoenix_resilience", {})
    return PhoenixConfig(
        enabled=bool(pr.get("enabled", True)),
        psi_min=float(pr.get("crisis_threshold", {}).get("psi_min", 0.21)),
        pe_max=float(pr.get("crisis_threshold", {}).get("pe_max", 2.4)),
        rubedo_growth=float(pr.get("recovery_rates", {}).get("rubedo_growth", 1.618)),
        pressure_discharge=float(pr.get("recovery_rates", {}).get("pressure_discharge", 0.7)),
        rubedo_cycles=int(pr.get("timing", {}).get("rubedo_cycles", 8)),
        stabilization_cycles=int(pr.get("timing", {}).get("stabilization_cycles", 13)),
        phi_modulation=bool(pr.get("sacred_ratios", {}).get("phi_modulation", True)),
        fibonacci_cadence=bool(pr.get("sacred_ratios", {}).get("fibonacci_cadence", True)),
    )


class PhoenixResiliencePlugin:
    def __init__(self, cfg: PhoenixConfig):
        self.cfg = cfg

    def next_phase(self, current_phase: str, psi: float, pe: float) -> str:
        """
        Decide the next phase based on current Ψ and PE.
        - Normal → Nigredo if pressure too high
        - Nigredo → Rubedo if ψ above crisis threshold
        - Rubedo → Normal if coherence restored and pressure low
        """
        if not self.cfg.enabled:
            return current_phase

        if current_phase.lower() == "normal" and pe > self.cfg.pe_max:
            return "Nigredo"
        if current_phase.lower() == "nigredo" and psi >= self.cfg.psi_min:
            return "Rubedo"
        if current_phase.lower() == "rubedo" and psi >= 0.83 and pe <= 0.5:
            return "Normal"
        return current_phase

    def on_incident(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """
        Respond to a canary incident with a mitigation recommendation.
        This is intentionally simple; real systems would consult WAF/rate‑limits/secrets.
        """
        t = incident.get("threatType") or incident.get("threat")
        realm = incident.get("realm", "default")
        if t in ("dos-attack", "injection"):
            return {
                "kind": "rate_limit",
                "parameters": {"realm": realm, "mode": "auto"},
            }
        if t in ("capability-breach", "treasury-exploit"):
            return {
                "kind": "capability_validation",
                "parameters": {"realm": realm, "revalidate": True},
            }
        if t == "integrity-violation":
            return {
                "kind": "integrity_verify",
                "parameters": {"realm": realm, "recompute_merkle": True},
            }
        return {"kind": "none", "parameters": {}}


if __name__ == "__main__":  # simple stdin runner for testing
    import sys
    cfg_path = sys.argv[1] if len(sys.argv) > 1 else "config/phoenix_resilience.yaml"
    cfg = load_config(cfg_path)
    plugin = PhoenixResiliencePlugin(cfg)
    for line in sys.stdin:
        try:
            evt = json.loads(line)
        except Exception:
            continue
        if evt.get("type") == "incident":
            print(json.dumps(plugin.on_incident(evt)))
        else:
            psi = float(evt.get("psi", 0.5))
            pe = float(evt.get("pe", 0.1))
            phase = str(evt.get("phase", "Normal"))
            print(json.dumps({"next_phase": plugin.next_phase(phase, psi, pe)}))

