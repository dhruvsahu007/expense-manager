#!/bin/bash
# End-to-End API Test Script for SplitMint
# Tests all modules: Auth, Expenses, Recurring, Budgets, Couple, Joint Account, Savings, Settlements, Dashboard, Reports, Notifications, Salary

BASE="http://localhost:8000/api"
PASS=0
FAIL=0
WARN=0
TIMESTAMP=$(date +%s)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

check() {
  local label="$1"
  local expected_code="$2"
  local actual_code="$3"
  local body="$4"
  
  if [ "$actual_code" == "$expected_code" ]; then
    echo -e "${GREEN}✅ PASS${NC} – $label (HTTP $actual_code)"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌ FAIL${NC} – $label (Expected $expected_code, got $actual_code)"
    echo "   Response: $(echo "$body" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
}

warn() {
  local label="$1"
  local msg="$2"
  echo -e "${YELLOW}⚠️  WARN${NC} – $label: $msg"
  WARN=$((WARN + 1))
}

section() {
  echo ""
  echo -e "${CYAN}━━━ $1 ━━━${NC}"
}

# Unique emails for this test run
EMAIL1="testuser1_${TIMESTAMP}@splitmint.com"
EMAIL2="testuser2_${TIMESTAMP}@splitmint.com"

# ─────────────────────────────────────────────────────────────
section "1. AUTHENTICATION"

# Signup User 1
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User 1\",\"email\":\"$EMAIL1\",\"password\":\"testpass123\",\"monthly_income\":50000,\"salary_date\":1}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "Signup User 1" "201" "$CODE" "$BODY"

# Signup User 2 (for couple mode)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User 2\",\"email\":\"$EMAIL2\",\"password\":\"testpass123\",\"monthly_income\":60000,\"salary_date\":5}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "Signup User 2" "201" "$CODE" "$BODY"

# Duplicate signup
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Dup User\",\"email\":\"$EMAIL1\",\"password\":\"testpass123\"}")
CODE=$(echo "$RESP" | tail -1)
check "Duplicate signup rejected" "400" "$CODE"

# Login User 1
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL1\",\"password\":\"testpass123\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
TOKEN1=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
check "Login User 1" "200" "$CODE" "$BODY"

if [ -z "$TOKEN1" ]; then
  echo -e "${RED}FATAL: Could not get auth token. Aborting.${NC}"
  exit 1
fi

# Login User 2
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL2\",\"password\":\"testpass123\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
TOKEN2=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
check "Login User 2" "200" "$CODE" "$BODY"

# Wrong password
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL1\",\"password\":\"wrongpass\"}")
CODE=$(echo "$RESP" | tail -1)
check "Wrong password rejected" "401" "$CODE"

# Get profile
RESP=$(curl -s -w "\n%{http_code}" "$BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "Get profile" "200" "$CODE" "$BODY"
USER1_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

# Update profile
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"monthly_budget":40000}')
CODE=$(echo "$RESP" | tail -1)
check "Update profile" "200" "$CODE"

# Unauthenticated access
RESP=$(curl -s -w "\n%{http_code}" "$BASE/auth/me")
CODE=$(echo "$RESP" | tail -1)
check "Unauthenticated access blocked" "401" "$CODE"

# ─────────────────────────────────────────────────────────────
section "2. EXPENSES"

# Get categories
RESP=$(curl -s -w "\n%{http_code}" "$BASE/expenses/categories" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
check "Get categories" "200" "$CODE"

# Create expense
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/expenses/" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"amount":500,"category":"Food","date":"2026-02-28","description":"Lunch","expense_type":"personal"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
EXP_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
check "Create expense" "201" "$CODE" "$BODY"

# Create more expenses for testing filters
curl -s -X POST "$BASE/expenses/" -H "Authorization: Bearer $TOKEN1" -H "Content-Type: application/json" \
  -d '{"amount":1500,"category":"Travel","date":"2026-02-25","description":"Cab","expense_type":"personal"}' > /dev/null
curl -s -X POST "$BASE/expenses/" -H "Authorization: Bearer $TOKEN1" -H "Content-Type: application/json" \
  -d '{"amount":2000,"category":"Shopping","date":"2026-02-20","description":"Clothes","expense_type":"personal"}' > /dev/null
curl -s -X POST "$BASE/expenses/" -H "Authorization: Bearer $TOKEN1" -H "Content-Type: application/json" \
  -d '{"amount":800,"category":"Food","date":"2026-01-15","description":"Last month dinner","expense_type":"personal"}' > /dev/null

# List expenses
RESP=$(curl -s -w "\n%{http_code}" "$BASE/expenses/" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
EXP_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
check "List expenses (got $EXP_COUNT)" "200" "$CODE"

# Filter by category
RESP=$(curl -s -w "\n%{http_code}" "$BASE/expenses/?category=Food" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
FOOD_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
check "Filter by category=Food (got $FOOD_COUNT)" "200" "$CODE"

# Filter by date range
RESP=$(curl -s -w "\n%{http_code}" "$BASE/expenses/?start_date=2026-02-01&end_date=2026-02-28" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
DATE_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
check "Filter by date range Feb (got $DATE_COUNT)" "200" "$CODE"

# Filter by amount range
RESP=$(curl -s -w "\n%{http_code}" "$BASE/expenses/?min_amount=1000&max_amount=2000" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
AMT_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
check "Filter by amount 1000-2000 (got $AMT_COUNT)" "200" "$CODE"

# Search
RESP=$(curl -s -w "\n%{http_code}" "$BASE/expenses/?search=Lunch" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
SEARCH_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
check "Search 'Lunch' (got $SEARCH_COUNT)" "200" "$CODE"

# Get single expense
RESP=$(curl -s -w "\n%{http_code}" "$BASE/expenses/$EXP_ID" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
check "Get single expense" "200" "$CODE"

# Update expense
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/expenses/$EXP_ID" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"amount":600,"description":"Updated lunch"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
UPD_AMT=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('amount',''))" 2>/dev/null)
check "Update expense (amount=$UPD_AMT)" "200" "$CODE"

# Export CSV
RESP=$(curl -s -w "\n%{http_code}" "$BASE/expenses/export" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
check "Export CSV" "200" "$CODE"

# Negative amount validation
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/expenses/" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"amount":-100,"category":"Food","date":"2026-02-28","expense_type":"personal"}')
CODE=$(echo "$RESP" | tail -1)
check "Negative amount rejected" "400" "$CODE"

# ─────────────────────────────────────────────────────────────
section "3. RECURRING EXPENSES"

# Create recurring
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/expenses/recurring" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"amount":999,"category":"Subscriptions","description":"Netflix","frequency":"monthly","day_of_month":15}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
REC_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
check "Create recurring expense" "201" "$CODE" "$BODY"

# List recurring
RESP=$(curl -s -w "\n%{http_code}" "$BASE/expenses/recurring/list" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
check "List recurring expenses" "200" "$CODE"

# Toggle recurring
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/expenses/recurring/$REC_ID/toggle" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
IS_ACTIVE=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('is_active',''))" 2>/dev/null)
check "Toggle recurring (is_active=$IS_ACTIVE)" "200" "$CODE"

# Toggle back
curl -s -X POST "$BASE/expenses/recurring/$REC_ID/toggle" -H "Authorization: Bearer $TOKEN1" > /dev/null

# Update recurring
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/expenses/recurring/$REC_ID" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"amount":1099,"description":"Netflix Premium"}')
CODE=$(echo "$RESP" | tail -1)
check "Update recurring expense" "200" "$CODE"

# Process recurring
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/expenses/recurring/process" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "Process recurring expenses" "200" "$CODE" "$BODY"

# ─────────────────────────────────────────────────────────────
section "4. BUDGETS"

# Create budget
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/budgets/" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"category":"Food","monthly_limit":5000}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
BUD_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
check "Create budget" "201" "$CODE" "$BODY"

# Create another budget
curl -s -X POST "$BASE/budgets/" -H "Authorization: Bearer $TOKEN1" -H "Content-Type: application/json" \
  -d '{"category":"Travel","monthly_limit":3000}' > /dev/null

# List budgets
RESP=$(curl -s -w "\n%{http_code}" "$BASE/budgets/" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "List budgets with spend info" "200" "$CODE"

# Update budget
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/budgets/$BUD_ID" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"monthly_limit":6000}')
CODE=$(echo "$RESP" | tail -1)
check "Update budget" "200" "$CODE"

# Upsert budget (same category)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/budgets/" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"category":"Food","monthly_limit":7000}')
CODE=$(echo "$RESP" | tail -1)
check "Upsert budget (same category)" "201" "$CODE"

# ─────────────────────────────────────────────────────────────
section "5. SALARY"

# Check salary
RESP=$(curl -s -w "\n%{http_code}" "$BASE/salary/check" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "Check salary day" "200" "$CODE" "$BODY"

# Credit salary
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/salary/credit" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"amount":50000}')
CODE=$(echo "$RESP" | tail -1)
check "Credit salary" "201" "$CODE"

# Duplicate salary
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/salary/credit" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"amount":50000}')
CODE=$(echo "$RESP" | tail -1)
check "Duplicate salary rejected" "409" "$CODE"

# Get current salary
RESP=$(curl -s -w "\n%{http_code}" "$BASE/salary/current" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
check "Get current salary" "200" "$CODE"

# ─────────────────────────────────────────────────────────────
section "6. DASHBOARD"

# Individual dashboard
RESP=$(curl -s -w "\n%{http_code}" "$BASE/dashboard/individual" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
TOTAL_EXP=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'income={d[\"total_income\"]}, expenses={d[\"total_expenses\"]}, savings={d[\"savings_rate\"]}%')" 2>/dev/null)
check "Individual dashboard ($TOTAL_EXP)" "200" "$CODE"

# ─────────────────────────────────────────────────────────────
section "7. NOTIFICATIONS"

# Get notifications
RESP=$(curl -s -w "\n%{http_code}" "$BASE/dashboard/notifications" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
NOTIF_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
check "Get notifications (count=$NOTIF_COUNT)" "200" "$CODE"

# Unread count
RESP=$(curl -s -w "\n%{http_code}" "$BASE/dashboard/notifications/unread-count" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
check "Unread count" "200" "$CODE"

# Mark all read
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/dashboard/notifications/mark-all-read" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
check "Mark all read" "200" "$CODE"

# ─────────────────────────────────────────────────────────────
section "8. REPORTS"

# Get reports
RESP=$(curl -s -w "\n%{http_code}" "$BASE/reports?months=6" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
MONTHS=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'months={len(d[\"monthly_breakdown\"])}, variance={len(d[\"budget_variance\"])}')" 2>/dev/null)
check "Reports ($MONTHS)" "200" "$CODE"

# ─────────────────────────────────────────────────────────────
section "9. COUPLE MODE"

# Invite partner
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/couple/invite" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{\"partner_email\":\"$EMAIL2\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
COUPLE_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
check "Invite partner" "201" "$CODE" "$BODY"

# Get couple status (user1 - inviter)
RESP=$(curl -s -w "\n%{http_code}" "$BASE/couple/status" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'status={d[\"status\"]}, role={d.get(\"role\",\"\")}')" 2>/dev/null)
check "Couple status ($STATUS)" "200" "$CODE"

# Get pending invites (user2)
RESP=$(curl -s -w "\n%{http_code}" "$BASE/couple/pending-invites" \
  -H "Authorization: Bearer $TOKEN2")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
INV_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
check "Pending invites for User 2 (count=$INV_COUNT)" "200" "$CODE"

# Accept invite
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/couple/accept/$COUPLE_ID" \
  -H "Authorization: Bearer $TOKEN2")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
check "Accept invite (status=$STATUS)" "200" "$CODE"

# ─── Shared Expenses ─────────────
# Create shared expense (equal split)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/couple/expenses" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"amount":2000,"category":"Food","description":"Dinner together","split_type":"equal","split_ratio":"50:50","date":"2026-02-28"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
SHARED_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
check "Create shared expense (equal)" "201" "$CODE"

# Create shared expense (percentage split)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/couple/expenses" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{"amount":3000,"category":"Travel","description":"Trip expenses","split_type":"percentage","split_ratio":"60:40","date":"2026-02-27"}')
CODE=$(echo "$RESP" | tail -1)
check "Create shared expense (60:40)" "201" "$CODE"

# List shared expenses
RESP=$(curl -s -w "\n%{http_code}" "$BASE/couple/expenses" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
SE_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
check "List shared expenses (count=$SE_COUNT)" "200" "$CODE"

# Update shared expense
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/couple/expenses/$SHARED_ID" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"amount":2500,"description":"Updated dinner"}')
CODE=$(echo "$RESP" | tail -1)
check "Update shared expense" "200" "$CODE"

# Get balance
RESP=$(curl -s -w "\n%{http_code}" "$BASE/couple/balance" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
BAL=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'total={d[\"total_shared\"]}, u1_paid={d[\"user_1_paid\"]}, u2_paid={d[\"user_2_paid\"]}, net={d[\"net_balance\"]}')" 2>/dev/null)
check "Balance summary ($BAL)" "200" "$CODE"

# ─── Settlement ────
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/couple/settle" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"amount":500,"note":"Partial settlement"}')
CODE=$(echo "$RESP" | tail -1)
check "Create settlement" "201" "$CODE"

# List settlements
RESP=$(curl -s -w "\n%{http_code}" "$BASE/couple/settlements" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
check "List settlements" "200" "$CODE"

# ─── Joint Account ────
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/couple/joint-account" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"account_name":"Our Joint Fund"}')
CODE=$(echo "$RESP" | tail -1)
check "Create joint account" "201" "$CODE"

# Add contribution
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/couple/joint-account/contribution" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"amount":10000,"contribution_type":"salary","note":"Feb salary share","date":"2026-02-28"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
CONTRIB_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
check "Add joint contribution" "201" "$CODE"

# User 2 contributes
curl -s -X POST "$BASE/couple/joint-account/contribution" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{"amount":8000,"contribution_type":"salary","note":"Feb salary share","date":"2026-02-28"}' > /dev/null

# Get joint account summary
RESP=$(curl -s -w "\n%{http_code}" "$BASE/couple/joint-account" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
JA_BAL=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'balance={d[\"balance\"]}, u1={d[\"user_1_contributed\"]}, u2={d[\"user_2_contributed\"]}')" 2>/dev/null)
check "Joint account summary ($JA_BAL)" "200" "$CODE"

# Pay shared expense from joint
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/couple/expenses" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"amount":1500,"category":"Rent","description":"Utility bill","split_type":"equal","split_ratio":"50:50","date":"2026-02-28","paid_from_joint":true}')
CODE=$(echo "$RESP" | tail -1)
check "Shared expense from joint account" "201" "$CODE"

# List joint transactions
RESP=$(curl -s -w "\n%{http_code}" "$BASE/couple/joint-account/transactions" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
TXN_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
check "Joint transactions (count=$TXN_COUNT)" "200" "$CODE"

# ─── Savings Goals ────
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/couple/goals" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"title":"Europe Trip","target_amount":200000,"deadline":"2027-01-01"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
GOAL_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
check "Create savings goal" "201" "$CODE"

# Contribute to goal
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/couple/goals/$GOAL_ID/contribute" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"amount":5000}')
CODE=$(echo "$RESP" | tail -1)
check "Contribute to goal (User 1)" "200" "$CODE"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/couple/goals/$GOAL_ID/contribute" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{"amount":3000}')
CODE=$(echo "$RESP" | tail -1)
check "Contribute to goal (User 2)" "200" "$CODE"

# List goals
RESP=$(curl -s -w "\n%{http_code}" "$BASE/couple/goals" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
GOAL_AMT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'current={d[0][\"current_amount\"]}, pct={d[0][\"percent_complete\"]}%')" 2>/dev/null)
check "List goals ($GOAL_AMT)" "200" "$CODE"

# List contributions for goal
RESP=$(curl -s -w "\n%{http_code}" "$BASE/couple/goals/$GOAL_ID/contributions" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
CONTRIB_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
check "Goal contributions (count=$CONTRIB_COUNT)" "200" "$CODE"

# Couple dashboard
RESP=$(curl -s -w "\n%{http_code}" "$BASE/dashboard/couple" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
CD=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'shared={d[\"shared_expenses_total\"]}, u1={d[\"user_1_paid\"]}, u2={d[\"user_2_paid\"]}')" 2>/dev/null)
check "Couple dashboard ($CD)" "200" "$CODE"

# ─────────────────────────────────────────────────────────────
section "10. VALIDATION CHECKS"

# Invalid split ratio format
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/couple/expenses" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"amount":1000,"category":"Food","split_type":"percentage","split_ratio":"70:70","date":"2026-02-28"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "Invalid percentage split (70:70) rejected" "422" "$CODE" "$BODY"

# ─────────────────────────────────────────────────────────────
section "11. DELETE & CLEANUP"

# Delete an expense
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/expenses/$EXP_ID" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
check "Delete expense" "204" "$CODE"

# Delete recurring
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/expenses/recurring/$REC_ID" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
check "Delete recurring expense" "204" "$CODE"

# Delete shared expense
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/couple/expenses/$SHARED_ID" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
check "Delete shared expense" "204" "$CODE"

# ─────────────────────────────────────────────────────────────
section "CLEANUP: Delete test users"

# Delete User 1
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN1")
CODE=$(echo "$RESP" | tail -1)
check "Delete User 1 account" "204" "$CODE"

# Delete User 2
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN2")
CODE=$(echo "$RESP" | tail -1)
check "Delete User 2 account" "204" "$CODE"

# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ PASSED: $PASS${NC}  |  ${RED}❌ FAILED: $FAIL${NC}  |  ${YELLOW}⚠️  WARNINGS: $WARN${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
