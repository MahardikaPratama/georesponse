/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Service is the hotspot package's use case: fetch current

	hotspots from Repository, falling back to the last successful
	result when the upstream BMKG service is unavailable, so a
	transient BMKG hiccup degrades gracefully (stale data) instead of
	breaking the map layer outright.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package hotspot

import (
	"context"
	"fmt"
	"sync"
)

// Service is the hotspot use case. Unlike resource.Service, it has no
// permission checker, history recorder, or transaction runner — hotspots
// are read-only, unauthenticated-by-nature situational data with no
// mutation and no per-role visibility rules.
type Service struct {
	repo  Repository
	cache *lastGoodCache
}

// NewService constructs a Service backed by repo.
func NewService(repo Repository) *Service {
	return &Service{repo: repo, cache: &lastGoodCache{}}
}

// ListHotspots returns every hotspot matching f. If repo.List fails, the
// last successful result (however old) is returned instead, so the map
// layer keeps showing something rather than erroring on every transient
// BMKG outage. ErrUpstreamUnavailable is only returned when BMKG is
// unreachable AND no prior successful result exists to fall back to.
func (s *Service) ListHotspots(ctx context.Context, f Filters) ([]Hotspot, error) {
	hotspots, err := s.repo.List(ctx, f)
	if err == nil {
		s.cache.set(hotspots)
		return hotspots, nil
	}

	if cached, ok := s.cache.get(); ok {
		return cached, nil
	}

	return nil, fmt.Errorf("list hotspots: %w", ErrUpstreamUnavailable)
}

// lastGoodCache holds the most recent successful hotspot list, guarded by
// a mutex since Service may be called concurrently by multiple requests.
type lastGoodCache struct {
	mu   sync.Mutex
	data []Hotspot
	has  bool
}

func (c *lastGoodCache) set(data []Hotspot) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data = data
	c.has = true
}

func (c *lastGoodCache) get() ([]Hotspot, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.data, c.has
}
