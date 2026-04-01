import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-verify if token is present
    if (token) {
      verifyEmail();
    }
  }, [token]);

  async function verifyEmail() {
    if (!token) {
      setError('No verification token provided');
      return;
    }

    try {
      setVerifying(true);
      const res = await api('/auth/verify-email', {
        method: 'POST',
        body: { token }
      });

      if (res.ok) {
        setVerified(true);
        setError(null);
      } else {
        setError(res.body?.error || 'Verification failed');
        setVerified(false);
      }
    } catch (err) {
      setError('An error occurred during verification');
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <h2 className="text-2xl font-semibold mb-4">Email Verification</h2>
          <p className="text-slate-400 mb-6">
            No verification token found. Please check your email for the verification link.
          </p>
          <Link to="/login">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Back to Login
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <div className="text-center">
          {verifying ? (
            <>
              <h2 className="text-2xl font-semibold mb-4">Verifying Email...</h2>
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
              </div>
              <p className="text-slate-400">Please wait while we verify your email address.</p>
            </>
          ) : verified ? (
            <>
              <h2 className="text-2xl font-semibold mb-4 text-green-400">✓ Email Verified!</h2>
              <div className="bg-green-900/20 border border-green-600 rounded p-4 mb-6">
                <p className="text-slate-200">
                  Your email has been successfully verified. You can now log in to your account.
                </p>
              </div>
              <Link to="/login">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Go to Login
                </Button>
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-4 text-red-400">✗ Verification Failed</h2>
              <div className="bg-red-900/20 border border-red-600 rounded p-4 mb-6">
                <p className="text-slate-200 mb-3">{error}</p>
                <p className="text-sm text-slate-400">
                  The link may have expired or is invalid.
                </p>
              </div>
              <div className="space-y-3">
                <Link to="/register">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Create New Account
                  </Button>
                </Link>
                <Link to="/resend-verification">
                  <Button variant="outline" className="w-full">
                    Resend Verification Email
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
