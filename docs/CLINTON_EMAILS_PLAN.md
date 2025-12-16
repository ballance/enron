# Hillary Clinton Emails Dataset Integration Plan

## Overview

Add the Hillary Clinton FOIA emails dataset (~30K emails) as a second dataset alongside the existing Enron corpus, allowing users to switch between datasets and compare communication patterns.

## Dataset Information

**Source:** [Kaggle - Hillary Clinton's Emails](https://www.kaggle.com/datasets/kaggle/hillary-clinton-emails)

**Contents:**
- ~30,000 emails from Hillary Clinton's private server (2009-2013)
- Released by State Department via FOIA requests
- CSV files: Emails.csv, EmailReceivers.csv, Persons.csv, Aliases.csv

**Alternative Sources:**
- [GitHub - Transformation Code](https://github.com/benhamner/hillary-clinton-emails)
- [data.world - Clinton Emails](https://data.world/briangriffey/clinton-emails)

## Architecture Decision: Separate Schemas

Use separate PostgreSQL schemas to keep datasets isolated and allow easy switching:

```
enron_db
├── public (Enron dataset - existing)
│   ├── people
│   ├── messages
│   ├── message_recipients
│   ├── threads
│   └── views
│
└── clinton (Clinton dataset - new)
    ├── people
    ├── messages
    ├── message_recipients
    ├── threads
    └── views
```

**Benefits:**
- Clean separation of datasets
- Easy to add more datasets in future
- No schema changes to existing Enron data
- Can compare schemas side-by-side

## Implementation Phases

### Phase 1: Data Acquisition & ETL

**Goal:** Download and parse Clinton emails into PostgreSQL

**Tasks:**
1. Download Kaggle dataset (requires Kaggle API key or manual download)
2. Create `scripts/clinton_etl` directory
3. Create SQL schema for `clinton` namespace
4. Parse CSV files:
   - `Emails.csv` → `clinton.messages`
   - `EmailReceivers.csv` → `clinton.message_recipients`
   - `Persons.csv` → `clinton.people`
   - `Aliases.csv` → `clinton.person_aliases`
5. Build thread detection (same logic as Enron)
6. Create materialized views for network analysis

**Files to create:**
- `scripts/clinton_etl/download_dataset.sh`
- `scripts/clinton_etl/parse_emails.js`
- `scripts/clinton_etl/build_threads.js`
- `database/schemas/clinton_schema.sql`

**SQL Schema:**
```sql
CREATE SCHEMA IF NOT EXISTS clinton;

CREATE TABLE clinton.people (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  sent_count INT DEFAULT 0,
  received_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clinton.messages (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(500) UNIQUE NOT NULL,
  from_person_id INT REFERENCES clinton.people(id),
  subject TEXT,
  body TEXT,
  date TIMESTAMP,
  timestamp DOUBLE PRECISION,
  in_reply_to VARCHAR(500),
  classification VARCHAR(50), -- UNCLASSIFIED, CONFIDENTIAL, etc.
  case_number VARCHAR(100),
  doc_number VARCHAR(100),
  thread_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clinton.message_recipients (
  id SERIAL PRIMARY KEY,
  message_id INT REFERENCES clinton.messages(id),
  person_id INT REFERENCES clinton.people(id),
  recipient_type VARCHAR(10) -- 'to', 'cc', 'bcc'
);

CREATE TABLE clinton.threads (
  -- Same structure as Enron threads
);
```

---

### Phase 2: Backend Multi-Dataset Support

**Goal:** Enable backend to query either Enron or Clinton dataset

**Approach:**
Add dataset parameter to all API routes, use schema-prefixed queries.

**Changes:**

1. **Database Config** - Add schema selection:
```javascript
// backend/src/config/database.js
export function getSchemaPrefix(dataset = 'enron') {
  const schemas = {
    'enron': 'public',
    'clinton': 'clinton'
  };
  return schemas[dataset] || schemas.enron;
}
```

2. **Update Services** - Add dataset parameter:
```javascript
// backend/src/services/analyticsService.js
export async function getOverallStats(dataset = 'enron') {
  const schema = getSchemaPrefix(dataset);
  const query = `
    SELECT
      COUNT(*) as total_people
    FROM ${schema}.people
    ...
  `;
}
```

3. **Update Routes** - Accept dataset query param:
```javascript
// backend/src/routes/analytics.js
router.get('/stats', asyncHandler(async (req, res) => {
  const dataset = req.query.dataset || 'enron';
  const stats = await getOrSetCache(
    cacheKeys.stats(dataset),
    cacheTTL.stats,
    () => getOverallStats(dataset)
  );
  res.json(stats);
}));
```

**Files to modify:**
- All service files in `backend/src/services/`
- All route files in `backend/src/routes/`
- `backend/src/config/database.js`
- `backend/src/config/redis.js` (update cache keys to include dataset)

---

### Phase 3: Frontend Dataset Selector

**Goal:** Add UI to switch between datasets

**Components to Create:**

1. **DatasetSelector Component:**
```jsx
// frontend/src/components/common/DatasetSelector.jsx
const DatasetSelector = ({ selectedDataset, onSelect }) => {
  const datasets = [
    {
      id: 'enron',
      name: 'Enron Corporation',
      description: '517K emails, 87K people',
      icon: '🏢',
      color: 'blue'
    },
    {
      id: 'clinton',
      name: 'Hillary Clinton (State Dept)',
      description: '30K emails, 2009-2013',
      icon: '🇺🇸',
      color: 'purple'
    }
  ];

  return (
    <div className="flex gap-4">
      {datasets.map(dataset => (
        <button
          key={dataset.id}
          onClick={() => onSelect(dataset.id)}
          className={`... ${selectedDataset === dataset.id ? 'active' : ''}`}
        >
          <span className="text-2xl">{dataset.icon}</span>
          <div>{dataset.name}</div>
          <div className="text-sm">{dataset.description}</div>
        </button>
      ))}
    </div>
  );
};
```

2. **Global Dataset State (Zustand):**
```javascript
// frontend/src/store/datasetStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useDatasetStore = create(
  persist(
    (set) => ({
      selectedDataset: 'enron',
      setDataset: (dataset) => set({ selectedDataset: dataset }),
    }),
    {
      name: 'dataset-storage', // localStorage key
    }
  )
);
```

3. **Update API Client:**
```javascript
// frontend/src/api/client.js
import useDatasetStore from '../store/datasetStore';

// Add dataset param to all requests
api.interceptors.request.use((config) => {
  const dataset = useDatasetStore.getState().selectedDataset;
  config.params = {
    ...config.params,
    dataset
  };
  return config;
});
```

**Files to create:**
- `frontend/src/components/common/DatasetSelector.jsx`
- `frontend/src/store/datasetStore.js`

**Files to modify:**
- `frontend/src/components/common/Layout.jsx` (add DatasetSelector to header)
- `frontend/src/api/client.js` (inject dataset param)

---

### Phase 4: Dataset-Specific Features

**Goal:** Handle unique characteristics of Clinton dataset

**Clinton-Specific Fields:**
- **Classification markings** (UNCLASSIFIED, CONFIDENTIAL, SECRET)
- **Case numbers** (F-2014-20439, etc.)
- **Document numbers** (C05739545, etc.)
- **Redactions** (show redacted portions)

**UI Enhancements:**

1. **Classification Badge:**
```jsx
// Show classification on messages
{message.classification && (
  <span className={`badge ${getClassificationColor(message.classification)}`}>
    {message.classification}
  </span>
)}
```

2. **Redaction Indicator:**
```jsx
// Highlight redacted content
<div className="message-body">
  {message.body.includes('[REDACTED]') && (
    <div className="redaction-notice">
      ⚠️ This message contains redacted content
    </div>
  )}
  {message.body}
</div>
```

3. **Dataset-Specific Stats:**
- Enron: Show employee hierarchy, trading desk activity
- Clinton: Show classification distribution, redaction stats

**Files to create:**
- `frontend/src/components/clinton/ClassificationBadge.jsx`
- `frontend/src/components/clinton/RedactionIndicator.jsx`

---

### Phase 5: Testing & Documentation

**Goal:** Ensure both datasets work correctly

**Testing:**
1. Test all views with both datasets:
   - Dashboard
   - Network Graph
   - Timeline
   - Thread Explorer
   - Mailbox Simulation

2. Compare performance:
   - Query speed (Clinton is smaller, should be faster)
   - Network rendering (fewer nodes)

3. Verify cache isolation (Enron cache ≠ Clinton cache)

**Documentation:**
1. Update README.md with:
   - Dataset comparison table
   - How to download Clinton data
   - How to switch datasets

2. Create dataset comparison chart:
```
| Feature          | Enron           | Clinton        |
|------------------|-----------------|----------------|
| Total Emails     | 517,000         | 30,000         |
| People           | 87,000          | ~500           |
| Threads          | 127,000         | ~8,000         |
| Date Range       | 1998-2002       | 2009-2013      |
| Unique Features  | Trading data    | Classifications|
```

---

## Timeline Estimate

- **Phase 1 (ETL):** 4-6 hours
- **Phase 2 (Backend):** 3-4 hours
- **Phase 3 (Frontend Selector):** 2-3 hours
- **Phase 4 (Dataset Features):** 2-3 hours
- **Phase 5 (Testing):** 2-3 hours

**Total:** ~15-20 hours

---

## Future Enhancements

Once Clinton dataset is integrated:

1. **Comparison Mode:**
   - Side-by-side network graphs
   - Compare communication patterns
   - Temporal overlay (2009-2013 vs 1998-2002)

2. **Additional Datasets:**
   - Sony Pictures hack
   - DNC emails
   - Avocado Research corpus

3. **Cross-Dataset Search:**
   - Search across both datasets
   - Find similar communication patterns

4. **Dataset Merging:**
   - Combined network of all datasets
   - Person matching across datasets

---

## Open Questions

1. **Classification Handling:**
   - Should we filter by classification level?
   - Add classification-specific views?

2. **Redaction Display:**
   - How to visually indicate redactions?
   - Parse `[REDACTED]` markers?

3. **Performance:**
   - Will 3D graph work well with smaller Clinton dataset?
   - Adjust layout algorithms per dataset?

---

## Resources

- [Kaggle Dataset](https://www.kaggle.com/datasets/kaggle/hillary-clinton-emails)
- [GitHub - Transformation Code](https://github.com/benhamner/hillary-clinton-emails)
- [State Department FOIA Portal](https://foia.state.gov/)
- [Clinton Email Analysis Research](https://www3.cs.stonybrook.edu/~mueller/papers/Analyzing%20Hillary%20Clinton%20Emails%20VIS%202016.pdf)
