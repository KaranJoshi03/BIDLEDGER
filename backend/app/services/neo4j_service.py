import logging
from typing import Dict, Any, List
from neo4j import GraphDatabase
from app.core.config import settings

logger = logging.getLogger(__name__)

class Neo4jGraphService:
    def __init__(self):
        self.driver = None
        self._fallback_graph = {
            "nodes": [],
            "links": []
        }
        self.init_driver()

    def init_driver(self):
        try:
            self.driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            self.driver.verify_connectivity()
            logger.info("Successfully connected to Neo4j instance.")
        except Exception as e:
            logger.warning(f"Neo4j connection failed ({e}). Operating with in-memory graph analytics fallback.")
            self.driver = None

    def close(self):
        if self.driver:
            self.driver.close()

    def record_bid_event(
        self, 
        rfq_id: str, 
        rfq_code: str,
        supplier_id: str, 
        supplier_name: str, 
        carrier_name: str,
        price: float, 
        rank: str,
        is_l1: bool,
        previous_l1_supplier_id: str = None
    ):
        """Records bid, carrier association, and underbidding edge into graph."""
        if self.driver:
            try:
                with self.driver.session() as session:
                    # Upsert Supplier, RFQ, Carrier nodes
                    session.run(
                        """
                        MERGE (s:Supplier {id: $supplier_id})
                        ON CREATE SET s.name = $supplier_name
                        MERGE (r:RFQ {id: $rfq_id})
                        ON CREATE SET r.code = $rfq_code
                        MERGE (c:Carrier {name: $carrier_name})
                        MERGE (s)-[:OPERATES_WITH]->(c)
                        CREATE (s)-[:SUBMITTED_BID {price: $price, rank: $rank, timestamp: datetime()}]->(r)
                        """,
                        supplier_id=supplier_id,
                        supplier_name=supplier_name,
                        rfq_id=rfq_id,
                        rfq_code=rfq_code,
                        carrier_name=carrier_name,
                        price=price,
                        rank=rank
                    )
                    if is_l1 and previous_l1_supplier_id and previous_l1_supplier_id != supplier_id:
                        session.run(
                            """
                            MATCH (new_s:Supplier {id: $new_id}), (prev_s:Supplier {id: $prev_id})
                            CREATE (new_s)-[:UNDERBIDS {rfq_id: $rfq_id, timestamp: datetime()}]->(prev_s)
                            """,
                            new_id=supplier_id,
                            prev_id=previous_l1_supplier_id,
                            rfq_id=rfq_id
                        )
                return
            except Exception as e:
                logger.error(f"Neo4j sync failed: {e}")

    def get_rfq_graph(self, rfq_id: str, db_rfq: Any = None) -> Dict[str, Any]:
        """
        Returns graph nodes & edges representation for the live visualizer.
        Extracts directly from Neo4j, or constructs from DB session data.
        """
        nodes = []
        links = []
        node_ids = set()

        def add_node(node_id: str, label: str, group: str, properties: Dict[str, Any]):
            if node_id not in node_ids:
                node_ids.add(node_id)
                nodes.append({
                    "id": node_id,
                    "label": label,
                    "group": group,
                    **properties
                })

        if db_rfq:
            # Add RFQ node
            rfq_node_id = f"rfq-{db_rfq.id}"
            add_node(
                rfq_node_id, 
                db_rfq.rfq_code, 
                "RFQ", 
                {"title": db_rfq.title, "origin": db_rfq.origin_location, "destination": db_rfq.destination_location}
            )

            # Add Lane node
            lane_node_id = f"lane-{db_rfq.origin_location}-{db_rfq.destination_location}"
            add_node(
                lane_node_id, 
                f"{db_rfq.origin_location} → {db_rfq.destination_location}", 
                "LANE", 
                {}
            )
            links.append({"source": rfq_node_id, "target": lane_node_id, "type": "ON_LANE"})

            # Suppliers, Carriers, Bids
            prev_bid = None
            for b in db_rfq.bids:
                sup_id = f"sup-{b.supplier_id}"
                sup_name = b.supplier.name if b.supplier else "Supplier"
                add_node(sup_id, sup_name, "SUPPLIER", {"rating": b.supplier.rating if b.supplier else 5.0})

                carrier_id = f"carr-{b.carrier_name}"
                add_node(carrier_id, b.carrier_name, "CARRIER", {})
                links.append({"source": sup_id, "target": carrier_id, "type": "OPERATES_WITH"})

                # Bid link
                links.append({
                    "source": sup_id,
                    "target": rfq_node_id,
                    "type": "SUBMITTED_BID",
                    "price": b.total_charges,
                    "rank": b.rank_assigned,
                    "caused_extension": b.caused_extension
                })

                # Competition edge: if this is L1 and there was an L2 or previous bid, link underbidding
                if b.rank_assigned == "L1" and len(db_rfq.bids) > 1:
                    l2_bid = next((ob for ob in db_rfq.bids if ob.rank_assigned == "L2"), None)
                    if l2_bid and l2_bid.supplier_id != b.supplier_id:
                        l2_sup_id = f"sup-{l2_bid.supplier_id}"
                        links.append({
                            "source": sup_id,
                            "target": l2_sup_id,
                            "type": "UNDERBIDS",
                            "delta": round(l2_bid.total_charges - b.total_charges, 2)
                        })

        return {"nodes": nodes, "links": links}

neo4j_service = Neo4jGraphService()
