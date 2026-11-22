# BidLedger: High-Level Design (HLD)

## 1. System Overview
**BidLedger** is an enterprise-grade Request for Quotation (RFQ) platform engineered specifically for **British Auction-style dynamic bidding**. In traditional procurement auctions, suppliers frequently engage in "bid sniping"—submitting artificially low bids in the final seconds before auction close, denying competitors fair response time and denying buyers optimal price discovery.

BidLedger solves this through configurable algorithmic auction extensions bounded by a strict, tamper-proof **Forced Close Time**, paired with a dual-database architecture: **PostgreSQL** for ACID-compliant transactional bid ledgering and **Neo4j** for real-time competitive graph analytics (underbidding networks, supplier clusters, and L1 dominance transitions).

---

## 2. Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (ReactJS / Vite / Dark Mode UI)"]
        UI_Buyer["Buyer Studio & Management"]
        UI_Auction["Live British Auction Room"]
        UI_Supplier["Supplier Bidding Console"]
        UI_Graph["Neo4j Graph & Analytics Explorer"]
    end

    subgraph GatewayLayer ["API & Realtime Gateway (FastAPI)"]
        HTTP_API["REST Endpoints (/api/rfqs, /api/bids, /api/analytics)"]
        WS_HUB["WebSocket Hub (/ws/auctions/{rfq_id})"]
        AUTH_VAL["Input Validation & Policy Engine"]
    end

    subgraph EngineLayer ["Core Auction & Extension Engine"]
        RULES_ENG["British Auction Rules Engine"]
        EXT_LOGIC["Trigger Window (X) & Extension (Y) Evaluator"]
        FORCED_CAP["Forced Close Cap Enforcer (Hard Stop Rule)"]
        RANK_CALC["L1/L2/L3 Ranking & Delta Computer"]
    end

    subgraph AsyncLayer ["Asynchronous & Scheduled Tasks"]
        CELERY_WORKER["Celery Task Workers"]
        CELERY_BEAT["Celery Beat / Async Close Monitor"]
        REDIS_BROKER[("Redis / RabbitMQ Queue & Pub/Sub")]
    end

    subgraph StorageLayer ["Data Persistence & Graph Intelligence"]
        PG_DB[("PostgreSQL DB (Transactional Ledger, Bids, RFQs, Audit Log)")]
        NEO4J_DB[("Neo4j Graph DB (Carrier Networks, Underbidding Lineage, L1 Flips)")]
    end

    %% Client Interactions
    UI_Buyer -->|Create RFQ & Config| HTTP_API
    UI_Supplier -->|Submit Quote| HTTP_API
    UI_Auction <-->|Bid Stream & Live Timer Updates| WS_HUB
    UI_Graph -->|Fetch Graph Topology| HTTP_API

    %% Gateway to Engine
    HTTP_API --> AUTH_VAL
    AUTH_VAL --> RULES_ENG
    RULES_ENG --> EXT_LOGIC
    EXT_LOGIC --> FORCED_CAP
    FORCED_CAP --> RANK_CALC

    %% Engine to Storage & Async
    RANK_CALC -->|ACID Transaction| PG_DB
    RANK_CALC -->|Sync Graph Nodes & Edges| NEO4J_DB
    RULES_ENG -->|Broadcast Extension / Bid| WS_HUB
    RULES_ENG -->|Schedule Close Trigger| REDIS_BROKER

    REDIS_BROKER <--> CELERY_WORKER
    CELERY_BEAT --> REDIS_BROKER
    CELERY_WORKER -->|Auto-Close Expired Auctions| PG_DB
    CELERY_WORKER -->|Broadcast Status to WS| WS_HUB
```

---

## 3. Core Architectural Components

### 3.1 Frontend (ReactJS + Tailwind CSS + Dark Mode)
- **Design Philosophy**: Minimalist, dark-mode architectural styling inspired by high-end design systems (deep obsidian backgrounds `#09090b`, `#121217`, subtle borders `#27272a`, high-contrast typography, emerald for active/saving metrics, amber for warning/extension zones, and rose for hard forced close).
- **Live Auction Room**: Sub-second synchronized countdown, dynamic pulse when inside the **Trigger Window (X)**, animated extension notifications, live L1/L2/L3 leaderboard, split quote breakdown (Freight + Origin + Destination charges), and immutable audit activity timeline.
- **Interactive Simulation Bench**: Built-in test harness enabling buyers and evaluators to fast-forward the auction clock, simulate rival bids during the final 2 minutes, and test all three extension triggers without waiting hours.

### 3.2 Backend Service (FastAPI)
- **High Concurrency Async API**: Fully asynchronous request handling for quote submission and query endpoints.
- **WebSocket Broadcast Engine**: In-memory connection manager and Redis Pub/Sub integration broadcasting bid placements, ranking recalculations, and time extension events to all connected buyers and suppliers.
- **Dual-Mode Persistence Layer**: Runs natively against PostgreSQL in production, with seamless zero-dependency local SQLite support for instant local demonstrations.

### 3.3 British Auction Rules Engine
When a quote is submitted:
1. **Window Validation**: Checks that `bid_start_time <= now < bid_close_time` and `now < forced_close_time`.
2. **Quote Total**: Sums `freight_charges + origin_charges + destination_charges`.
3. **Rank Snapshot**: Captures supplier rankings prior to bid execution.
4. **Rank Recalculation**: Sorts all active bids in ascending order of total cost (earlier timestamp breaks ties).
5. **Trigger Window (X Minutes) Check**:
   $$\Delta t = \text{bid\_close\_time} - \text{now}$$
   Evaluates if $0 \le \Delta t \le X\text{ minutes}$.
6. **Trigger Condition Evaluation**:
   - **Trigger A (Any Bid)**: Any valid bid placed within $X$ minutes fires an extension.
   - **Trigger B (Any Rank Change)**: Fires if any supplier's position in the leaderboard changed.
   - **Trigger C (Lowest Bidder / L1 Rank Change)**: Fires strictly if the L1 leader position changes.
7. **Forced Close Hard Cap Enforcement**:
   $$\text{new\_close\_time} = \min(\text{current\_close\_time} + Y, \text{forced\_close\_time})$$
   The auction **never** extends past `forced_close_time`. If the extension would exceed the forced close time, it is capped exactly at the forced close time. If already at forced close time, the extension is rejected and marked as capped.

### 3.4 Asynchronous Worker & Scheduler (Celery + Redis)
- **Dynamic Auction Close Task**: Periodically verifies closing criteria and transitions auctions from `active` to `closed` or `force_closed`.
- **Scheduled Timers**: Celery tasks triggered at `bid_close_time` and `forced_close_time` to seal bids and declare winning L1 suppliers.

### 3.5 Graph Intelligence Engine (Neo4j)
- BidLedger models the procurement network as a property graph:
  - `(s:Supplier)-[:SUBMITTED_BID]->(r:RFQ)`
  - `(s1:Supplier)-[:UNDERBIDS {delta_amount, timestamp}]->(s2:Supplier)`
  - `(s:Supplier)-[:OVERTOOK_L1]->(r:RFQ)`
  - `(s:Supplier)-[:OPERATES_CARRIER]->(c:Carrier)`
- Graph algorithms analyze supplier competition density, detect cartel/collusion patterns, and compute supplier win-ratios across freight lanes.

---

## 4. Sequence Diagram: Quote Submission & British Extension Flow

```mermaid
sequenceDiagram
    autonumber
    actor Supplier as Supplier (Carrier)
    participant API as FastAPI Backend
    participant Engine as Auction Rules Engine
    participant DB as PostgreSQL Ledger
    participant Graph as Neo4j Graph
    participant WS as WebSocket Hub
    actor Buyer as Buyer / Competitors

    Supplier->>API: POST /api/bids/submit (RFQ ID, Freight, Origin, Dest, Carrier)
    API->>Engine: Evaluate Quote & Extension Eligibility
    Engine->>DB: Fetch RFQ Config & Current Leaderboard (L1..Ln)
    
    Note over Engine: Calculate Total Charges & Recompute Rankings
    Engine->>Engine: Check if current_time in [Close - X, Close]
    
    alt In Trigger Window & Trigger Met
        Engine->>Engine: Calculate Extension: new_close = min(close + Y, forced_close)
        Engine->>DB: Update RFQ (new_bid_close_time, extension_count++)
        Engine->>DB: Insert ActivityLog (TIME_EXTENDED, reason, delta)
    end
    
    Engine->>DB: Insert Bid Record & Update Ranks
    Engine->>Graph: Upsert (:Supplier)-[:UNDERBIDS]->(:Supplier) & (:RFQ)
    Engine->>WS: Broadcast {type: "AUCTION_UPDATE", bids, new_close, alert}
    WS-->>Buyer: Live UI Alert: "Auction Extended by Y mins! Reason: ..."
    WS-->>Supplier: Updated Leaderboard & Rank Confirmation
    API-->>Supplier: 201 Created (Bid ID, Assigned Rank L1, Extended: true/false)
```
