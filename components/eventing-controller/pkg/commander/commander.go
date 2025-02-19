//go:generate mockgen -package=mocks -destination=mocks/commander.go -source=commander.go

package commander

import (
	"sigs.k8s.io/controller-runtime/pkg/manager"

	"github.com/kyma-project/kyma/components/eventing-controller/pkg/env"
)

type Params map[string]interface{}

// Commander defines the interface of different implementations
type Commander interface {
	// Init inizializes the commander and passes the Manager to use.
	Init(mgr manager.Manager) error

	// Start runs the initialized commander instance.
	Start(defaultSubsConfig env.DefaultSubscriptionConfig, params Params) error

	// Stop tells the commander instance to shutdown and clean-up.
	Stop() error
}
