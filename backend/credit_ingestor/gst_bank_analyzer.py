"""
gst_bank_analyzer.py - Cross-analysis of GST returns and bank statements.

Responsibilities:
  - Summarise GST invoice data (total revenue declared, top buyers, etc.).
  - Summarise bank credit inflows.
  - Detect revenue inflation by comparing GST declared revenue vs bank inflows.
  - Detect circular trading by building a seller→buyer transaction graph and
    looking for short cycles using NetworkX.
  - Return structured analysis dicts consumed by the risk engine.
"""

import logging
from typing import Any, Dict, List, Optional

import networkx as nx
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Thresholds (tune as needed)
# ---------------------------------------------------------------------------

# If GST revenue exceeds bank credit inflow by this ratio, flag inflation
REVENUE_INFLATION_RATIO = 1.5      # 150 % → +50 % more declared than received

# Minimum number of edges for circular trading graph analysis to be meaningful
MIN_EDGES_FOR_GRAPH = 3

# Cycles up to this length are considered "short" and suspicious
MAX_CYCLE_LENGTH = 4


# ---------------------------------------------------------------------------
# GST summary
# ---------------------------------------------------------------------------

def _summarise_gst(gst_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute aggregate statistics from normalised GST DataFrame.

    Returns a dict with:
        total_invoice_value, invoice_count, unique_buyers,
        unique_sellers, top_buyers (list of {gstin, total_value})
    """
    if gst_df is None or gst_df.empty:
        return {}

    summary: Dict[str, Any] = {}

    if "invoice_value" in gst_df.columns:
        summary["total_invoice_value"] = round(float(gst_df["invoice_value"].sum()), 2)
    summary["invoice_count"] = len(gst_df)

    if "buyer_gstin" in gst_df.columns:
        summary["unique_buyers"] = int(gst_df["buyer_gstin"].nunique())
        if "invoice_value" in gst_df.columns:
            top = (
                gst_df.groupby("buyer_gstin")["invoice_value"]
                .sum()
                .sort_values(ascending=False)
                .head(5)
                .reset_index()
            )
            summary["top_buyers"] = [
                {"gstin": row["buyer_gstin"], "total_value": round(float(row["invoice_value"]), 2)}
                for _, row in top.iterrows()
            ]

    if "gstin" in gst_df.columns:
        summary["unique_sellers"] = int(gst_df["gstin"].nunique())

    return summary


# ---------------------------------------------------------------------------
# Bank summary
# ---------------------------------------------------------------------------

def _summarise_bank(bank_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute aggregate statistics from normalised bank statement DataFrame.

    Returns a dict with:
        total_credit_inflow, total_debit_outflow, net_flow, transaction_count
    """
    if bank_df is None or bank_df.empty:
        return {}

    summary: Dict[str, Any] = {}
    summary["total_credit_inflow"] = round(float(bank_df.get("credit", pd.Series([0])).sum()), 2)
    summary["total_debit_outflow"] = round(float(bank_df.get("debit", pd.Series([0])).sum()), 2)
    summary["net_flow"] = round(
        summary["total_credit_inflow"] - summary["total_debit_outflow"], 2
    )
    summary["transaction_count"] = len(bank_df)

    return summary


# ---------------------------------------------------------------------------
# Revenue inflation detection
# ---------------------------------------------------------------------------

def _detect_revenue_inflation(
    gst_summary: Dict[str, Any],
    bank_summary: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    Compare GST-declared revenue with actual bank credit inflows.

    Returns a flag dict if inflation is detected, else None.
    """
    gst_revenue = gst_summary.get("total_invoice_value")
    bank_inflow = bank_summary.get("total_credit_inflow")

    if gst_revenue is None or bank_inflow is None:
        return None

    if bank_inflow == 0:
        if gst_revenue > 0:
            return {
                "flag": "REVENUE_INFLATION",
                "description": (
                    f"GST declared revenue of {gst_revenue:,.2f} "
                    "but bank shows ZERO credit inflow."
                ),
                "gst_revenue": gst_revenue,
                "bank_inflow": bank_inflow,
                "ratio": None,
            }
        return None

    ratio = gst_revenue / bank_inflow
    if ratio >= REVENUE_INFLATION_RATIO:
        return {
            "flag": "REVENUE_INFLATION",
            "description": (
                f"GST declared revenue ({gst_revenue:,.2f}) is "
                f"{ratio:.1f}x the actual bank credit inflow ({bank_inflow:,.2f}). "
                "Possible revenue inflation."
            ),
            "gst_revenue": gst_revenue,
            "bank_inflow": bank_inflow,
            "ratio": round(ratio, 2),
        }

    return None


# ---------------------------------------------------------------------------
# Circular trading detection via NetworkX
# ---------------------------------------------------------------------------

def _detect_circular_trading(gst_df: pd.DataFrame) -> Optional[Dict[str, Any]]:
    """
    Build a directed transaction graph (seller GSTIN → buyer GSTIN) and
    search for short cycles indicating possible circular trading.

    Returns a flag dict with detected cycles if found, else None.
    """
    if gst_df is None or gst_df.empty:
        return None

    required = {"gstin", "buyer_gstin"}
    if not required.issubset(set(gst_df.columns)):
        logger.warning("Circular trading check skipped: missing gstin/buyer_gstin columns.")
        return None

    # Filter rows where both GSTINs are non-null
    edges_df = gst_df[["gstin", "buyer_gstin", "invoice_value"]].dropna(
        subset=["gstin", "buyer_gstin"]
    )

    if len(edges_df) < MIN_EDGES_FOR_GRAPH:
        return None

    # Build directed graph; edge weight = total invoice value between that pair
    G = nx.DiGraph()
    for _, row in edges_df.iterrows():
        seller = str(row["gstin"]).strip()
        buyer = str(row["buyer_gstin"]).strip()
        value = float(row["invoice_value"]) if "invoice_value" in edges_df.columns else 0.0
        if G.has_edge(seller, buyer):
            G[seller][buyer]["weight"] += value
            G[seller][buyer]["count"] += 1
        else:
            G.add_edge(seller, buyer, weight=value, count=1)

    # Detect simple cycles up to MAX_CYCLE_LENGTH
    detected_cycles: List[List[str]] = []
    try:
        for cycle in nx.simple_cycles(G):
            if 2 <= len(cycle) <= MAX_CYCLE_LENGTH:
                detected_cycles.append(cycle)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Cycle detection error: %s", exc)
        return None

    if not detected_cycles:
        return None

    return {
        "flag": "CIRCULAR_TRADING",
        "description": (
            f"Detected {len(detected_cycles)} short transaction cycle(s) among GSTINs. "
            "This may indicate circular/round-tripping trade to inflate revenue."
        ),
        "cycle_count": len(detected_cycles),
        # Serialise the first 5 cycles for the report (full list can be large)
        "sample_cycles": detected_cycles[:5],
        "total_nodes": G.number_of_nodes(),
        "total_edges": G.number_of_edges(),
    }


# ---------------------------------------------------------------------------
# Dense sub-graph detection (small group with unusually high trade volume)
# ---------------------------------------------------------------------------

def _detect_dense_subgraph(gst_df: pd.DataFrame) -> Optional[Dict[str, Any]]:
    """
    Identify pairs or small groups of GSTINs that trade exclusively with each
    other. A density of 1.0 in a small clique (≤5 nodes) is suspicious.
    """
    if gst_df is None or gst_df.empty:
        return None
    if not {"gstin", "buyer_gstin"}.issubset(set(gst_df.columns)):
        return None

    edges_df = gst_df[["gstin", "buyer_gstin"]].dropna()
    if edges_df.empty:
        return None

    G = nx.DiGraph()
    G.add_edges_from(zip(edges_df["gstin"], edges_df["buyer_gstin"]))

    suspicious_groups = []
    for component in nx.weakly_connected_components(G):
        if 2 <= len(component) <= 5:
            sub = G.subgraph(component)
            # Density = actual_edges / possible_edges
            density = nx.density(sub)
            if density >= 0.8:
                suspicious_groups.append({
                    "nodes": list(component),
                    "density": round(density, 3),
                    "edges": sub.number_of_edges(),
                })

    if not suspicious_groups:
        return None

    return {
        "flag": "DENSE_SUBGRAPH",
        "description": (
            f"Found {len(suspicious_groups)} small GSTIN group(s) with unusually dense "
            "mutual trading (possible shell-entity network)."
        ),
        "groups": suspicious_groups,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_gst_vs_bank(
    gst_df: Optional[pd.DataFrame],
    bank_df: Optional[pd.DataFrame],
) -> Dict[str, Any]:
    """
    Perform cross-analysis of GST returns vs bank statement data.

    Steps:
      1. Summarise GST transactions.
      2. Summarise bank credit inflows.
      3. Detect revenue inflation.
      4. Detect circular trading using graph analysis.
      5. Detect dense sub-graphs (shell entity networks).

    Args:
        gst_df:  Normalised GST DataFrame (from parser.parse_gst_file).
        bank_df: Normalised bank DataFrame (from parser.parse_bank_file).

    Returns:
        Dict with keys: gst_summary, bank_summary, fraud_flags.
    """
    gst_summary = _summarise_gst(gst_df) if gst_df is not None else {}
    bank_summary = _summarise_bank(bank_df) if bank_df is not None else {}

    fraud_flags: List[Dict[str, Any]] = []

    # Revenue inflation check (needs both datasets)
    inflation_flag = _detect_revenue_inflation(gst_summary, bank_summary)
    if inflation_flag:
        fraud_flags.append(inflation_flag)

    # Circular trading check (GST only)
    circular_flag = _detect_circular_trading(gst_df)
    if circular_flag:
        fraud_flags.append(circular_flag)

    # Dense sub-graph check (GST only)
    dense_flag = _detect_dense_subgraph(gst_df)
    if dense_flag:
        fraud_flags.append(dense_flag)

    return {
        "gst_summary": gst_summary,
        "bank_summary": bank_summary,
        "fraud_flags": fraud_flags,
    }
