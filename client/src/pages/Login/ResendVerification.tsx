import React, { useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import FormField from '../../components/ui/formField';
import { Link, useSearchParams } from 'react-router-dom';

export default function ResendVerification() {
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';
  
  const [email, setEmail] = useState(prefillEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      const res = await api('/auth/resend-verification', {
        method: 'POST',
        body: { email }
      });

      if (res.ok) {
        setSent(true);
      } else {
        setError(res.body?.error || 'Failed to resend verification email');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <h2 className="text-2xl font-semibold mb-4">Resend Verification Email</h2>
        
        {sent ? (
          <div>
            <div className="bg-green-900/20 border border-green-600 rounded p-4 mb-6">
              <p className="text-foreground mb-2">✓ Verification email sent!</p>
              <p className="text-sm text-foreground">
                We've sent a new verification link to <strong>{email}</strong>. Please check your inbox and click the link to verify your email.
              </p>
            </div>
            <p className="text-sm text-foreground mb-4">
              If you don't see the email, check your spam folder. The link expires in 24 hours.
            </p>
            <Link to="/login">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Back to Login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <>
              <p className="text-sm text-foreground mb-4">
                Enter the email address associated with your account, and we'll send you a new verification link.
              </p>
            </>
            
            <FormField label="Email Address" id="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
              />
            </FormField>

            {error && (
              <div className="bg-red-900/20 border border-red-600 rounded p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-4">
              <Button 
                type="submit" 
                variant="default" 
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Verification Email'}
              </Button>
              <Link to="/login">
                <Button 
                  type="button"
                  variant="outline" 
                  size="lg"
                  className="w-full"
                >
                  Back to Login
                </Button>
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
