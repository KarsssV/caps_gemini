package headCountLog

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"gin-auth-supabase/src/db"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewService(q *db.Queries, pool *pgxpool.Pool) *Service {
	return &Service{q: q, pool: pool}
}

func (s *Service) Add(ctx context.Context, req HeadCountLogAdd) (*db.HeadCountLog, error) {
	sourceName, err := s.q.GetSourceNameByID(ctx, req.SourceID)
	headCountLog, err := s.q.CreateHeadCountLog(ctx, db.CreateHeadCountLogParams{
		SourceName: sourceName,
		HeadCount:  req.HeadCount,
		CurrentFps: req.CurrentFps,
		Timestamp:  req.Timestamp,
	})
	return &headCountLog, err
}

func (s *Service) RequestBySource(ctx context.Context, sourceName string) (*[]db.HeadCountLog, error) {
	headCountLogs, err := s.q.GetHeadCountLogBySource(ctx, sourceName)
	if err != nil {
		return nil, errors.New("Source not found")
	}

	return &headCountLogs, nil
}

func (s *Service) RequestLatestBySource(ctx context.Context, sourceName string) (*[]db.HeadCountLog, error) {
	headCountLogs, err := s.q.GetLatestHeadCountLogBySource(ctx, sourceName)
	if err != nil {
		return nil, errors.New("Source not found")
	}

	return &headCountLogs, nil
}

// RequestAll fetches all logs with optional source filter and limit
func (s *Service) RequestAll(ctx context.Context, sourceName string, limitStr string) (interface{}, error) {
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 5000
	}

	var query string
	var args []interface{}

	if sourceName != "" {
		query = `SELECT id, source_name, head_count, current_fps, created_at, timestamp 
				 FROM head_count_logs 
				 WHERE source_name = $1 
				 ORDER BY timestamp DESC 
				 LIMIT $2`
		args = []interface{}{sourceName, limit}
	} else {
		query = `SELECT id, source_name, head_count, current_fps, created_at, timestamp 
				 FROM head_count_logs 
				 ORDER BY timestamp DESC 
				 LIMIT $1`
		args = []interface{}{limit}
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	type LogRow struct {
		ID         string    `json:"id"`
		SourceName string    `json:"source_name"`
		HeadCount  int32     `json:"head_count"`
		CurrentFps float64   `json:"current_fps"`
		CreatedAt  time.Time `json:"created_at"`
		Timestamp  time.Time `json:"timestamp"`
	}

	var logs []LogRow
	for rows.Next() {
		var r LogRow
		if err := rows.Scan(&r.ID, &r.SourceName, &r.HeadCount, &r.CurrentFps, &r.CreatedAt, &r.Timestamp); err != nil {
			return nil, err
		}
		logs = append(logs, r)
	}

	if logs == nil {
		logs = []LogRow{}
	}
	return logs, nil
}

// DashboardStats holds all aggregated statistics for the dashboard
type DashboardStats struct {
	TotalCount       int64           `json:"total_count"`
	TodayCount       int64           `json:"today_count"`
	WeekCount        int64           `json:"week_count"`
	MonthCount       int64           `json:"month_count"`
	PrevWeekCount    int64           `json:"prev_week_count"`
	PrevMonthCount   int64           `json:"prev_month_count"`
	PeakCount        int32           `json:"peak_count"`
	AvgDailyCount    float64         `json:"avg_daily_count"`
	AvgHourlyCount   float64         `json:"avg_hourly_count"`
	WeekGrowthRate   float64         `json:"week_growth_rate"`
	MonthGrowthRate  float64         `json:"month_growth_rate"`
	HourlyDistrib    []HourBucket    `json:"hourly_distribution"`
	DailyDistrib     []DayBucket     `json:"daily_distribution"`
	WeekdayDistrib   []WeekdayBucket `json:"weekday_distribution"`
	MonthlyDistrib   []MonthBucket   `json:"monthly_distribution"`
	Top10Hours       []HourBucket    `json:"top10_hours"`
	Top10Days        []DayBucket     `json:"top10_days"`
	HeatmapDayHour   []HeatmapCell   `json:"heatmap_day_hour"`
	WeekendVsWeekday WeekendCompare  `json:"weekend_vs_weekday"`
}

type HourBucket struct {
	Hour  int     `json:"hour"`
	Count float64 `json:"count"`
}

type DayBucket struct {
	Date  string  `json:"date"`
	Count float64 `json:"count"`
}

type WeekdayBucket struct {
	Weekday string  `json:"weekday"`
	WdNum   int     `json:"weekday_num"`
	Count   float64 `json:"count"`
}

type MonthBucket struct {
	Month string  `json:"month"`
	Count float64 `json:"count"`
}

type HeatmapCell struct {
	Weekday int     `json:"weekday"` // 0=Sun..6=Sat
	Hour    int     `json:"hour"`
	Count   float64 `json:"count"`
}

type WeekendCompare struct {
	WeekdayAvg float64 `json:"weekday_avg"`
	WeekendAvg float64 `json:"weekend_avg"`
}

// RequestStats computes comprehensive analytics for the dashboard
func (s *Service) RequestStats(ctx context.Context, sourceName string) (*DashboardStats, error) {
	stats := &DashboardStats{}
	whereClause := ""
	args := []interface{}{}

	if sourceName != "" {
		whereClause = "WHERE source_name = $1"
		args = append(args, sourceName)
	}

	placeholder := func(n int) string { return fmt.Sprintf("$%d", n) }

	// Total count
	rowQ := s.pool.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM head_count_logs %s", whereClause), args...)
	_ = rowQ.Scan(&stats.TotalCount)

	// Today count
	todayArgs := append(args, time.Now().Format("2006-01-02"))
	todayWhere := whereClause
	if todayWhere == "" {
		todayWhere = fmt.Sprintf("WHERE DATE(timestamp) = %s::date", placeholder(len(todayArgs)))
	} else {
		todayWhere += fmt.Sprintf(" AND DATE(timestamp) = %s::date", placeholder(len(todayArgs)))
	}
	rowQ = s.pool.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM head_count_logs %s", todayWhere), todayArgs...)
	_ = rowQ.Scan(&stats.TodayCount)

	// This week count
	weekArgs := append(args, time.Now().Format("2006-01-02"))
	weekWhere := whereClause
	if weekWhere == "" {
		weekWhere = fmt.Sprintf("WHERE DATE_TRUNC('week', timestamp) = DATE_TRUNC('week', %s::date)", placeholder(len(weekArgs)))
	} else {
		weekWhere += fmt.Sprintf(" AND DATE_TRUNC('week', timestamp) = DATE_TRUNC('week', %s::date)", placeholder(len(weekArgs)))
	}
	rowQ = s.pool.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM head_count_logs %s", weekWhere), weekArgs...)
	_ = rowQ.Scan(&stats.WeekCount)

	// Prev week count
	prevWeekArgs := append(args, time.Now().AddDate(0, 0, -7).Format("2006-01-02"))
	prevWeekWhere := whereClause
	if prevWeekWhere == "" {
		prevWeekWhere = fmt.Sprintf("WHERE DATE_TRUNC('week', timestamp) = DATE_TRUNC('week', %s::date)", placeholder(len(prevWeekArgs)))
	} else {
		prevWeekWhere += fmt.Sprintf(" AND DATE_TRUNC('week', timestamp) = DATE_TRUNC('week', %s::date)", placeholder(len(prevWeekArgs)))
	}
	rowQ = s.pool.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM head_count_logs %s", prevWeekWhere), prevWeekArgs...)
	_ = rowQ.Scan(&stats.PrevWeekCount)

	// This month count
	monthArgs := append(args, time.Now().Format("2006-01-02"))
	monthWhere := whereClause
	if monthWhere == "" {
		monthWhere = fmt.Sprintf("WHERE DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', %s::date)", placeholder(len(monthArgs)))
	} else {
		monthWhere += fmt.Sprintf(" AND DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', %s::date)", placeholder(len(monthArgs)))
	}
	rowQ = s.pool.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM head_count_logs %s", monthWhere), monthArgs...)
	_ = rowQ.Scan(&stats.MonthCount)

	// Prev month count
	prevMonthArgs := append(args, time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	prevMonthWhere := whereClause
	if prevMonthWhere == "" {
		prevMonthWhere = fmt.Sprintf("WHERE DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', %s::date)", placeholder(len(prevMonthArgs)))
	} else {
		prevMonthWhere += fmt.Sprintf(" AND DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', %s::date)", placeholder(len(prevMonthArgs)))
	}
	rowQ = s.pool.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM head_count_logs %s", prevMonthWhere), prevMonthArgs...)
	_ = rowQ.Scan(&stats.PrevMonthCount)

	// Peak count
	rowQ = s.pool.QueryRow(ctx, fmt.Sprintf("SELECT COALESCE(MAX(head_count), 0) FROM head_count_logs %s", whereClause), args...)
	_ = rowQ.Scan(&stats.PeakCount)

	// Avg daily count
	rowQ = s.pool.QueryRow(ctx, fmt.Sprintf(`
		SELECT COALESCE(AVG(daily_count), 0) FROM (
			SELECT DATE(timestamp) as day, AVG(head_count) as daily_count
			FROM head_count_logs %s
			GROUP BY DATE(timestamp)
		) t`, whereClause), args...)
	_ = rowQ.Scan(&stats.AvgDailyCount)

	// Avg hourly count
	rowQ = s.pool.QueryRow(ctx, fmt.Sprintf(`
		SELECT COALESCE(AVG(hourly_count), 0) FROM (
			SELECT DATE_TRUNC('hour', timestamp) as hour_bucket, AVG(head_count) as hourly_count
			FROM head_count_logs %s
			GROUP BY DATE_TRUNC('hour', timestamp)
		) t`, whereClause), args...)
	_ = rowQ.Scan(&stats.AvgHourlyCount)

	// Growth rates
	if stats.PrevWeekCount > 0 {
		stats.WeekGrowthRate = float64(stats.WeekCount-stats.PrevWeekCount) / float64(stats.PrevWeekCount) * 100
	}
	if stats.PrevMonthCount > 0 {
		stats.MonthGrowthRate = float64(stats.MonthCount-stats.PrevMonthCount) / float64(stats.PrevMonthCount) * 100
	}

	// Hourly distribution (avg per hour of day)
	hRows, err := s.pool.Query(ctx, fmt.Sprintf(`
		SELECT EXTRACT(HOUR FROM timestamp)::int as hr, ROUND(AVG(head_count)::numeric, 2) as avg_count
		FROM head_count_logs %s
		GROUP BY hr ORDER BY hr`, whereClause), args...)
	if err == nil {
		defer hRows.Close()
		for hRows.Next() {
			var b HourBucket
			_ = hRows.Scan(&b.Hour, &b.Count)
			stats.HourlyDistrib = append(stats.HourlyDistrib, b)
		}
	}

	// Daily distribution (last 90 days)
	dArgs := args
	dWhere := whereClause
	if dWhere == "" {
		dWhere = "WHERE timestamp >= NOW() - INTERVAL '90 days'"
	} else {
		dWhere += " AND timestamp >= NOW() - INTERVAL '90 days'"
	}
	dRows, err := s.pool.Query(ctx, fmt.Sprintf(`
		SELECT DATE(timestamp)::text as day, ROUND(AVG(head_count)::numeric, 2) as avg_count
		FROM head_count_logs %s
		GROUP BY day ORDER BY day`, dWhere), dArgs...)
	if err == nil {
		defer dRows.Close()
		for dRows.Next() {
			var b DayBucket
			_ = dRows.Scan(&b.Date, &b.Count)
			stats.DailyDistrib = append(stats.DailyDistrib, b)
		}
	}

	// Weekday distribution
	wdRows, err := s.pool.Query(ctx, fmt.Sprintf(`
		SELECT 
			EXTRACT(DOW FROM timestamp)::int as wd_num,
			TO_CHAR(timestamp, 'Day') as wd_name,
			ROUND(AVG(head_count)::numeric, 2) as avg_count
		FROM head_count_logs %s
		GROUP BY wd_num, wd_name ORDER BY wd_num`, whereClause), args...)
	if err == nil {
		defer wdRows.Close()
		for wdRows.Next() {
			var b WeekdayBucket
			_ = wdRows.Scan(&b.WdNum, &b.Weekday, &b.Count)
			stats.WeekdayDistrib = append(stats.WeekdayDistrib, b)
		}
	}

	// Monthly distribution
	mRows, err := s.pool.Query(ctx, fmt.Sprintf(`
		SELECT TO_CHAR(DATE_TRUNC('month', timestamp), 'YYYY-MM') as month, ROUND(AVG(head_count)::numeric, 2) as avg_count
		FROM head_count_logs %s
		GROUP BY month ORDER BY month`, whereClause), args...)
	if err == nil {
		defer mRows.Close()
		for mRows.Next() {
			var b MonthBucket
			_ = mRows.Scan(&b.Month, &b.Count)
			stats.MonthlyDistrib = append(stats.MonthlyDistrib, b)
		}
	}

	// Top 10 hours
	top10HRows, err := s.pool.Query(ctx, fmt.Sprintf(`
		SELECT EXTRACT(HOUR FROM timestamp)::int as hr, ROUND(AVG(head_count)::numeric, 2) as avg_count
		FROM head_count_logs %s
		GROUP BY hr ORDER BY avg_count DESC LIMIT 10`, whereClause), args...)
	if err == nil {
		defer top10HRows.Close()
		for top10HRows.Next() {
			var b HourBucket
			_ = top10HRows.Scan(&b.Hour, &b.Count)
			stats.Top10Hours = append(stats.Top10Hours, b)
		}
	}

	// Top 10 days
	top10DRows, err := s.pool.Query(ctx, fmt.Sprintf(`
		SELECT DATE(timestamp)::text as day, ROUND(AVG(head_count)::numeric, 2) as avg_count
		FROM head_count_logs %s
		GROUP BY day ORDER BY avg_count DESC LIMIT 10`, whereClause), args...)
	if err == nil {
		defer top10DRows.Close()
		for top10DRows.Next() {
			var b DayBucket
			_ = top10DRows.Scan(&b.Date, &b.Count)
			stats.Top10Days = append(stats.Top10Days, b)
		}
	}

	// Heatmap: weekday vs hour
	hmRows, err := s.pool.Query(ctx, fmt.Sprintf(`
		SELECT 
			EXTRACT(DOW FROM timestamp)::int as weekday,
			EXTRACT(HOUR FROM timestamp)::int as hour,
			ROUND(AVG(head_count)::numeric, 2) as avg_count
		FROM head_count_logs %s
		GROUP BY weekday, hour ORDER BY weekday, hour`, whereClause), args...)
	if err == nil {
		defer hmRows.Close()
		for hmRows.Next() {
			var cell HeatmapCell
			_ = hmRows.Scan(&cell.Weekday, &cell.Hour, &cell.Count)
			stats.HeatmapDayHour = append(stats.HeatmapDayHour, cell)
		}
	}

	// Weekend vs weekday comparison
	rowQ = s.pool.QueryRow(ctx, fmt.Sprintf(`
		SELECT COALESCE(AVG(CASE WHEN EXTRACT(DOW FROM timestamp) IN (0,6) THEN head_count END), 0) as weekend_avg,
		       COALESCE(AVG(CASE WHEN EXTRACT(DOW FROM timestamp) NOT IN (0,6) THEN head_count END), 0) as weekday_avg
		FROM head_count_logs %s`, whereClause), args...)
	_ = rowQ.Scan(&stats.WeekendVsWeekday.WeekendAvg, &stats.WeekendVsWeekday.WeekdayAvg)

	return stats, nil
}
