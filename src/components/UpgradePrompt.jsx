import React from 'react';

function UpgradePrompt({
  currentPlan,
  requiredPlan,
  feature,
  currentLimit,
  requiredLimit,
  style = {}
}) {
  const planColors = {
    'Free': '#95a5a6',
    'Basic': '#3498db',
    'Pro': '#9b59b6',
    'Enterprise': '#e74c3c'
  };

  const currentColor = planColors[currentPlan] || '#95a5a6';
  const requiredColor = planColors[requiredPlan] || '#3498db';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '8px',
      padding: '1.5rem',
      color: 'white',
      marginTop: '1rem',
      marginBottom: '1rem',
      ...style
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          fontSize: '2.5rem',
          lineHeight: 1
        }}>
          🚀
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.1rem' }}>
            Upgrade to {requiredPlan} Plan
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
            {feature && (
              <>
                <strong>{feature}</strong> is available in the {requiredPlan} plan and above.
              </>
            )}
            {currentLimit && requiredLimit && (
              <>
                Your current <span style={{
                  backgroundColor: currentColor,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontWeight: 'bold'
                }}>{currentPlan}</span> plan allows {currentLimit}.
                Upgrade to <span style={{
                  backgroundColor: requiredColor,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontWeight: 'bold'
                }}>{requiredPlan}</span> for {requiredLimit}.
              </>
            )}
          </p>
        </div>
        <div>
          <a
            href="/plans"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: 'white',
              color: '#667eea',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            View Plans
          </a>
        </div>
      </div>
    </div>
  );
}

export default UpgradePrompt;
