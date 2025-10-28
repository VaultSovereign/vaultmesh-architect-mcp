/// Phoenix Resilience Protocol — Tem plugin (Rust stub)
///
/// This crate demonstrates a minimal interface for integrating the
/// Phoenix protocol into a Tem engine.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Phase {
    Normal,
    Nigredo,
    Rubedo,
}

pub trait TemPlugin {
    fn next_phase(&self, current: Phase, psi: f64, pe: f64) -> Phase;
}

#[derive(Debug, Clone)]
pub struct Config {
    pub enabled: bool,
    pub psi_min: f64,
    pub pe_max: f64,
}

impl Default for Config {
    fn default() -> Self {
        Self { enabled: true, psi_min: 0.21, pe_max: 2.4 }
    }
}

pub struct PhoenixResilience {
    cfg: Config,
}

impl PhoenixResilience {
    pub fn new(cfg: Config) -> Self { Self { cfg } }
}

impl TemPlugin for PhoenixResilience {
    fn next_phase(&self, current: Phase, psi: f64, pe: f64) -> Phase {
        if !self.cfg.enabled {
            return current;
        }
        match current {
            Phase::Normal if pe > self.cfg.pe_max => Phase::Nigredo,
            Phase::Nigredo if psi >= self.cfg.psi_min => Phase::Rubedo,
            Phase::Rubedo if psi >= 0.83 && pe <= 0.5 => Phase::Normal,
            _ => current,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn transitions() {
        let p = PhoenixResilience::new(Config::default());
        assert_eq!(p.next_phase(Phase::Normal, 0.5, 3.0), Phase::Nigredo);
        assert_eq!(p.next_phase(Phase::Nigredo, 0.25, 1.0), Phase::Rubedo);
        assert_eq!(p.next_phase(Phase::Rubedo, 0.9, 0.4), Phase::Normal);
    }
}

