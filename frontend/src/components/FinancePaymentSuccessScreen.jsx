import React from 'react';
import { Box, Typography, Button, Divider, Chip } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const DEFAULT_LOGO = '/rakshak-logo.png';

/**
 * Paytm / PhonePe–style payment success panel for Finance flows.
 */
const FinancePaymentSuccessScreen = ({
  variant = 'single',
  amountFormatted,
  expenseNumber,
  /** Batch: list of expense numbers from API (`processed[].expenseNumber`) */
  expenseNumbers = [],
  utr,
  processedAt,
  batchCount,
  batchTotalFormatted,
  logoSrc = DEFAULT_LOGO,
  brandName = 'Rakshak Securitas',
  onDone,
  doneLabel = 'Done'
}) => {
  const when = processedAt
    ? new Date(processedAt).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

  const batchExpenseList = Array.isArray(expenseNumbers)
    ? expenseNumbers.filter(Boolean)
    : [];

  return (
    <Box
      sx={{
        textAlign: 'center',
        overflow: 'hidden',
        borderRadius: 2,
        bgcolor: 'background.paper'
      }}
    >
      {/* Rakshak branding — receipt-style header */}
      <Box
        sx={{
          px: 2,
          py: 2,
          bgcolor: '#fff',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          flexWrap: 'wrap'
        }}
      >
        <Box
          component="img"
          src={logoSrc}
          alt={brandName}
          sx={{
            height: { xs: 40, sm: 48 },
            width: 'auto',
            objectFit: 'contain',
            display: 'block'
          }}
        />
        <Box sx={{ textAlign: 'left' }}>
          <Typography
            variant="subtitle1"
            fontWeight={800}
            sx={{ color: '#0f172a', letterSpacing: 0.4, lineHeight: 1.2 }}
          >
            {brandName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Payment confirmation
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          background: 'linear-gradient(165deg, #0d9488 0%, #059669 45%, #047857 100%)',
          color: '#fff',
          px: 3,
          pt: 3,
          pb: 5,
          position: 'relative'
        }}
      >
        <Box
          sx={{
            '@keyframes popIn': {
              '0%': { transform: 'scale(0.3)', opacity: 0 },
              '55%': { transform: 'scale(1.08)', opacity: 1 },
              '100%': { transform: 'scale(1)', opacity: 1 }
            },
            animation: 'popIn 0.55s ease-out forwards',
            display: 'inline-flex',
            mb: 2,
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))'
          }}
        >
          <CheckCircleOutlineIcon sx={{ fontSize: 88, color: '#ecfdf5' }} />
        </Box>
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{ letterSpacing: 0.3, textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
        >
          Payment successful
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.5 }}>
          {variant === 'batch'
            ? 'Your batch transfer is complete'
            : 'Money marked as paid for this expense'}
        </Typography>

        {variant === 'single' && expenseNumber && (
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{
              mt: 2,
              px: 2,
              py: 0.75,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.18)',
              display: 'inline-block',
              letterSpacing: 0.5
            }}
          >
            Expense no. #{expenseNumber}
          </Typography>
        )}

        {variant === 'batch' && batchExpenseList.length > 0 && (
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{
              mt: 2,
              px: 2,
              py: 1,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.15)',
              display: 'block',
              maxWidth: '100%',
              mx: 'auto',
              wordBreak: 'break-word'
            }}
          >
            Expense no.:{' '}
            {batchExpenseList.slice(0, 12).join(', ')}
            {batchExpenseList.length > 12
              ? ` +${batchExpenseList.length - 12} more`
              : ''}
          </Typography>
        )}

        {variant === 'single' && amountFormatted && (
          <Typography
            variant="h3"
            fontWeight={800}
            sx={{ mt: 2.5, letterSpacing: -0.5 }}
          >
            {amountFormatted}
          </Typography>
        )}

        {variant === 'batch' && batchTotalFormatted && (
          <Typography
            variant="h3"
            fontWeight={800}
            sx={{ mt: 2.5, letterSpacing: -0.5 }}
          >
            {batchTotalFormatted}
          </Typography>
        )}
      </Box>

      <Box sx={{ px: 3, py: 2.5, bgcolor: '#f8fafc' }}>
        {variant === 'batch' && batchCount != null && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              alignItems: 'center'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Expenses paid
            </Typography>
            <Typography variant="body1" fontWeight={700}>
              {batchCount}
            </Typography>
          </Box>
        )}

        {expenseNumber && variant === 'single' && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              alignItems: 'center'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Expense no.
            </Typography>
            <Typography variant="body1" fontWeight={700}>
              #{expenseNumber}
            </Typography>
          </Box>
        )}

        {variant === 'batch' && batchExpenseList.length > 0 && (
          <Box sx={{ py: 1, textAlign: 'left' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              All expense numbers
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
                maxHeight: batchExpenseList.length > 24 ? 200 : 'none',
                overflowY: batchExpenseList.length > 24 ? 'auto' : 'visible'
              }}
            >
              {batchExpenseList.map((num, idx) => (
                <Chip
                  key={`${num}-${idx}`}
                  size="small"
                  label={`#${num}`}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Box>
          </Box>
        )}

        {utr && (
          <>
            {(expenseNumber || variant === 'batch' || batchExpenseList.length > 0) && (
              <Divider sx={{ my: 0.5 }} />
            )}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 1,
                alignItems: 'flex-start',
                gap: 2
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                CMS / Ref.
              </Typography>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ wordBreak: 'break-all', textAlign: 'right' }}
              >
                {utr}
              </Typography>
            </Box>
          </>
        )}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
            alignItems: 'center'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Date & time
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {when}
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={onDone}
          sx={{
            mt: 2.5,
            py: 1.4,
            borderRadius: 2,
            fontWeight: 700,
            fontSize: '1rem',
            textTransform: 'none',
            boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
            background: 'linear-gradient(90deg, #0d9488 0%, #059669 100%)',
            '&:hover': {
              background: 'linear-gradient(90deg, #0f766e 0%, #047857 100%)'
            }
          }}
        >
          {doneLabel}
        </Button>
      </Box>
    </Box>
  );
};

export default FinancePaymentSuccessScreen;
