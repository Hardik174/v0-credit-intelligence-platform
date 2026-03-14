class ResearchOutput:

    def __init__(self):
        self.entity = ""
        self.sector_trends = {}
        self.macro_indicators = []
        self.latest_research = []
        self.risk_signals = {}
        self.ai_insight_summary = ""

    def to_dict(self):
        return {
            "entity": self.entity,
            "sector_trends": self.sector_trends,
            "macro_indicators": self.macro_indicators,
            "latest_research": self.latest_research,
            "risk_signals": self.risk_signals,
            "ai_insight_summary": self.ai_insight_summary
        }