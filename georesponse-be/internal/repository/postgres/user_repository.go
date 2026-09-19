/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements auth.Repository against PostgreSQL.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/authorization"
)

// UserRepository is the PostgreSQL implementation of auth.Repository.
type UserRepository struct {
	db db
}

// NewUserRepository constructs a UserRepository backed by conn (a
// *pgxpool.Pool in production, or a pgx.Tx in tests).
func NewUserRepository(conn db) *UserRepository {
	return &UserRepository{db: conn}
}

// GetByID returns the user with the given id, along with the names of
// their currently assigned roles.
func (r *UserRepository) GetByID(ctx context.Context, id string) (*auth.User, error) {
	const query = `
		SELECT u.id, u.name, COALESCE(array_agg(ro.name) FILTER (WHERE ro.name IS NOT NULL), '{}')
		FROM users u
		LEFT JOIN user_roles ur ON ur.user_id = u.id
		LEFT JOIN roles ro ON ro.id = ur.role_id
		WHERE u.id = $1
		GROUP BY u.id, u.name
	`
	var user auth.User
	err := r.db.QueryRow(ctx, query, id).Scan(&user.ID, &user.Name, &user.RoleNames)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("get user %q: %w", id, auth.ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("get user %q: %w", id, err)
	}
	return &user, nil
}

// SetRoles replaces the full set of roles held by the user identified by
// userID with roleNames.
func (r *UserRepository) SetRoles(ctx context.Context, userID string, roleNames []string) error {
	return replaceJoinTable(ctx, r.db, joinTableSpec{
		JoinTable:    "user_roles",
		OwnerColumn:  "user_id",
		OwnerID:      userID,
		TargetColumn: "role_id",
		TargetTable:  "roles",
		TargetLookup: "name",
		Values:       roleNames,
		NotFoundErr: func(missing string) error {
			return fmt.Errorf("set roles for user %q: role %q: %w", userID, missing, authorization.ErrNotFound)
		},
	})
}
