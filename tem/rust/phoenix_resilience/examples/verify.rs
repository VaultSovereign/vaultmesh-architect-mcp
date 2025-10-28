use phoenix_resilience::{Config, PhoenixResilience, TemPlugin, Phase};
use serde_json::json;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let psi: f64 = args.get(1).and_then(|s| s.parse().ok()).unwrap_or(0.208);
    let pe: f64 = args.get(2).and_then(|s| s.parse().ok()).unwrap_or(2.5);
    let p = PhoenixResilience::new(Config::default());
    let next = p.next_phase(Phase::Normal, psi, pe);
    let phase = match next { Phase::Normal => "Normal", Phase::Nigredo => "Nigredo", Phase::Rubedo => "Rubedo" };
    println!("{}", json!({"next_phase": phase}));
}

