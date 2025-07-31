import React, { useState } from 'react';
import { Auth, AuthType, AuthParam } from '~/types/postman';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Textarea } from '~/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { PasswordInput } from '~/components/ui/password-input';
import { UrlVariableInput } from '~/components/UrlVariableInput';
import { 
  Shield, 
  Key, 
  User, 
  Lock, 
  Globe, 
  Cloud, 
  Fingerprint,
  ShieldCheck,
  X,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip';

interface AuthenticationEditorProps {
  auth?: Auth;
  onChange: (auth: Auth | undefined) => void;
  collectionAuth?: Auth;
  variables?: Record<string, string>;
}

const AUTH_TYPES: { value: AuthType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'noauth', label: 'No Auth', icon: <X className="h-4 w-4" />, description: 'No authentication' },
  { value: 'bearer', label: 'Bearer Token', icon: <Key className="h-4 w-4" />, description: 'Token-based authentication' },
  { value: 'basic', label: 'Basic Auth', icon: <User className="h-4 w-4" />, description: 'Username and password' },
  { value: 'apikey', label: 'API Key', icon: <Key className="h-4 w-4" />, description: 'API key in header or query' },
  { value: 'oauth2', label: 'OAuth 2.0', icon: <Shield className="h-4 w-4" />, description: 'OAuth 2.0 authorization' },
  { value: 'oauth1', label: 'OAuth 1.0', icon: <Shield className="h-4 w-4" />, description: 'OAuth 1.0a signature' },
  { value: 'jwt', label: 'JWT Bearer', icon: <ShieldCheck className="h-4 w-4" />, description: 'JSON Web Token' },
  { value: 'digest', label: 'Digest Auth', icon: <Lock className="h-4 w-4" />, description: 'HTTP Digest authentication' },
  { value: 'awsv4', label: 'AWS Signature', icon: <Cloud className="h-4 w-4" />, description: 'AWS Signature Version 4' },
  { value: 'hawk', label: 'Hawk Auth', icon: <Fingerprint className="h-4 w-4" />, description: 'Hawk authentication' },
  { value: 'ntlm', label: 'NTLM', icon: <Globe className="h-4 w-4" />, description: 'Windows NTLM authentication' },
  { value: 'custom', label: 'Custom', icon: <Shield className="h-4 w-4" />, description: 'Custom authentication headers' },
];

function getAuthParam(params: AuthParam[] | undefined, key: string): string {
  return params?.find(p => p.key === key)?.value || '';
}

function setAuthParam(params: AuthParam[] | undefined, key: string, value: string): AuthParam[] {
  // Create a new array to avoid mutating immutable objects
  const newParams = [...(params || [])];
  const index = newParams.findIndex(p => p.key === key);
  
  if (index >= 0) {
    // Replace existing param
    newParams[index] = { key, value, type: 'string' };
  } else {
    // Add new param
    newParams.push({ key, value, type: 'string' });
  }
  
  return newParams;
}

export function AuthenticationEditor({ auth, onChange, collectionAuth, variables = {} }: AuthenticationEditorProps) {
  const effectiveAuth = auth || collectionAuth;
  const isInherited = !auth && !!collectionAuth;
  const [showSecrets, setShowSecrets] = useState(false);

  const handleTypeChange = (type: AuthType) => {
    if (type === 'noauth') {
      onChange(undefined);
    } else {
      onChange({ type, [type]: [] });
    }
  };

  const updateParam = (authType: AuthType, key: string, value: string) => {
    // If we're editing an inherited auth or no auth exists, create a new auth object
    let authToUpdate = effectiveAuth;
    
    if (!auth && collectionAuth) {
      // When editing inherited auth, create a deep copy to avoid mutation
      authToUpdate = {
        type: collectionAuth.type,
        ...Object.keys(collectionAuth).reduce((acc, key) => {
          if (key !== 'type' && collectionAuth[key as keyof Auth]) {
            // Deep copy the auth params array
            acc[key] = [...(collectionAuth[key as keyof Auth] as AuthParam[] || [])];
          }
          return acc;
        }, {} as any)
      };
    } else if (!authToUpdate) {
      // Create a new auth object when no auth exists
      authToUpdate = {
        type: authType,
        [authType]: []
      };
    }
    
    const updatedAuth = {
      ...authToUpdate,
      [authType]: setAuthParam(authToUpdate[authType as keyof Auth] as AuthParam[], key, value)
    };
    
    onChange(updatedAuth);
  };

  const authType = effectiveAuth?.type || 'noauth';
  const selectedAuthType = AUTH_TYPES.find(t => t.value === authType);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>Authentication Type</Label>
          {isInherited && (
            <Badge variant="secondary" className="text-xs">
              Inherited from collection
            </Badge>
          )}
        </div>
        {/* Removed global Show/Hide Secrets button - each field has its own toggle */}
      </div>

      <Select 
        value={authType} 
        onValueChange={(value) => handleTypeChange(value as AuthType)}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            <div className="flex items-center gap-2">
              {selectedAuthType?.icon}
              <span>{selectedAuthType?.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {AUTH_TYPES.map(type => (
            <SelectItem key={type.value} value={type.value}>
              <div className="flex items-center gap-2">
                {type.icon}
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.description}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {authType !== 'noauth' && (
        <div className="space-y-4 pt-2">
          {/* Bearer Token */}
          {authType === 'bearer' && (
            <div className="space-y-2">
              <Label htmlFor="bearer-token">Token</Label>
              <UrlVariableInput
                id="bearer-token"
                value={getAuthParam(effectiveAuth?.bearer, 'token')}
                onChange={(value) => updateParam('bearer', 'token', value)}
                placeholder="Enter bearer token or {{variable}}"
                type="password"
                isPasswordField={true}
                vars={variables}
              />
            </div>
          )}

          {/* Basic Auth */}
          {authType === 'basic' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="basic-username">Username</Label>
                <UrlVariableInput
                  id="basic-username"
                  value={getAuthParam(effectiveAuth?.basic, 'username')}
                  onChange={(value) => updateParam('basic', 'username', value)}
                  placeholder="Enter username or {{variable}}"
                  vars={variables}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="basic-password">Password</Label>
                <UrlVariableInput
                  id="basic-password"
                  value={getAuthParam(effectiveAuth?.basic, 'password')}
                  onChange={(value) => updateParam('basic', 'password', value)}
                  placeholder="Enter password or {{variable}}"
                  type={showSecrets ? 'text' : 'password'}
                vars={variables}
                />
              </div>
            </div>
          )}

          {/* API Key */}
          {authType === 'apikey' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apikey-key">Key Name</Label>
                <UrlVariableInput
                  id="apikey-key"
                  value={getAuthParam(effectiveAuth?.apikey, 'key')}
                  onChange={(value) => updateParam('apikey', 'key', value)}
                  placeholder="e.g., X-API-Key"
                vars={variables}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apikey-value">Value</Label>
                <UrlVariableInput
                  id="apikey-value"
                  value={getAuthParam(effectiveAuth?.apikey, 'value')}
                  onChange={(value) => updateParam('apikey', 'value', value)}
                  placeholder="Enter API key or {{variable}}"
                  type={showSecrets ? 'text' : 'password'}
                vars={variables}
                />
              </div>
              <div className="space-y-2">
                <Label>Add to</Label>
                <RadioGroup
                  value={getAuthParam(effectiveAuth?.apikey, 'in') || 'header'}
                  onValueChange={(value) => updateParam('apikey', 'in', value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="header" id="apikey-header" />
                    <Label htmlFor="apikey-header" className="font-normal">Header</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="query" id="apikey-query" />
                    <Label htmlFor="apikey-query" className="font-normal">Query Params</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* OAuth 2.0 */}
          {authType === 'oauth2' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Grant Type</Label>
                <Select
                  value={getAuthParam(effectiveAuth?.oauth2, 'grant_type') || 'authorization_code'}
                  onValueChange={(value) => updateParam('oauth2', 'grant_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="authorization_code">Authorization Code</SelectItem>
                    <SelectItem value="implicit">Implicit</SelectItem>
                    <SelectItem value="password">Password Credentials</SelectItem>
                    <SelectItem value="client_credentials">Client Credentials</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Common OAuth2 fields */}
              <div className="space-y-2">
                <Label htmlFor="oauth2-access-token">Access Token</Label>
                <UrlVariableInput
                  id="oauth2-access-token"
                  value={getAuthParam(effectiveAuth?.oauth2, 'accessToken')}
                  onChange={(value) => updateParam('oauth2', 'accessToken', value)}
                  placeholder="Enter access token or {{variable}}"
                  type={showSecrets ? 'text' : 'password'}
                vars={variables}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="oauth2-client-id">Client ID</Label>
                  <UrlVariableInput
                    id="oauth2-client-id"
                    value={getAuthParam(effectiveAuth?.oauth2, 'clientId')}
                    onChange={(value) => updateParam('oauth2', 'clientId', value)}
                    placeholder="Client ID"
                vars={variables}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oauth2-client-secret">Client Secret</Label>
                  <UrlVariableInput
                    id="oauth2-client-secret"
                    value={getAuthParam(effectiveAuth?.oauth2, 'clientSecret')}
                    onChange={(value) => updateParam('oauth2', 'clientSecret', value)}
                    placeholder="Client Secret"
                    type={showSecrets ? 'text' : 'password'}
                vars={variables}
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    For authorization code flow, you'll need to obtain the access token externally and paste it above.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* JWT Bearer */}
          {authType === 'jwt' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jwt-token">JWT Token</Label>
                <Textarea
                  id="jwt-token"
                  value={getAuthParam(effectiveAuth?.jwt, 'token')}
                  onChange={(e) => updateParam('jwt', 'token', e.target.value)}
                  placeholder="Enter JWT token or {{variable}}"
                  className="font-mono text-sm min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jwt-header">Header Prefix (optional)</Label>
                <Input
                  id="jwt-header"
                  value={getAuthParam(effectiveAuth?.jwt, 'prefix') || 'Bearer'}
                  onChange={(e) => updateParam('jwt', 'prefix', e.target.value)}
                  placeholder="e.g., Bearer, JWT"
                />
              </div>
            </div>
          )}

          {/* AWS Signature v4 */}
          {authType === 'awsv4' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aws-access-key">Access Key</Label>
                  <UrlVariableInput
                    id="aws-access-key"
                    value={getAuthParam(effectiveAuth?.awsv4, 'accessKey')}
                    onChange={(value) => updateParam('awsv4', 'accessKey', value)}
                    placeholder="AWS Access Key"
                vars={variables}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aws-secret-key">Secret Key</Label>
                  <UrlVariableInput
                    id="aws-secret-key"
                    value={getAuthParam(effectiveAuth?.awsv4, 'secretKey')}
                    onChange={(value) => updateParam('awsv4', 'secretKey', value)}
                    placeholder="AWS Secret Key"
                    type={showSecrets ? 'text' : 'password'}
                vars={variables}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aws-region">Region</Label>
                  <UrlVariableInput
                    id="aws-region"
                    value={getAuthParam(effectiveAuth?.awsv4, 'region')}
                    onChange={(value) => updateParam('awsv4', 'region', value)}
                    placeholder="e.g., us-east-1"
                vars={variables}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aws-service">Service</Label>
                  <UrlVariableInput
                    id="aws-service"
                    value={getAuthParam(effectiveAuth?.awsv4, 'service')}
                    onChange={(value) => updateParam('awsv4', 'service', value)}
                    placeholder="e.g., s3, dynamodb"
                vars={variables}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aws-session-token">Session Token (optional)</Label>
                <UrlVariableInput
                  id="aws-session-token"
                  value={getAuthParam(effectiveAuth?.awsv4, 'sessionToken')}
                  onChange={(value) => updateParam('awsv4', 'sessionToken', value)}
                  placeholder="AWS Session Token"
                  type={showSecrets ? 'text' : 'password'}
                vars={variables}
                />
              </div>
            </div>
          )}

          {/* Digest Auth */}
          {authType === 'digest' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="digest-username">Username</Label>
                <UrlVariableInput
                  id="digest-username"
                  value={getAuthParam(effectiveAuth?.digest, 'username')}
                  onChange={(value) => updateParam('digest', 'username', value)}
                  placeholder="Enter username"
                vars={variables}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="digest-password">Password</Label>
                <UrlVariableInput
                  id="digest-password"
                  value={getAuthParam(effectiveAuth?.digest, 'password')}
                  onChange={(value) => updateParam('digest', 'password', value)}
                  placeholder="Enter password"
                  type={showSecrets ? 'text' : 'password'}
                vars={variables}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="digest-realm">Realm (optional)</Label>
                <UrlVariableInput
                  id="digest-realm"
                  value={getAuthParam(effectiveAuth?.digest, 'realm')}
                  onChange={(value) => updateParam('digest', 'realm', value)}
                  placeholder="Authentication realm"
                vars={variables}
                />
              </div>
            </div>
          )}

          {/* OAuth 1.0 */}
          {authType === 'oauth1' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="oauth1-consumer-key">Consumer Key</Label>
                  <UrlVariableInput
                    id="oauth1-consumer-key"
                    value={getAuthParam(effectiveAuth?.oauth1, 'consumerKey')}
                    onChange={(value) => updateParam('oauth1', 'consumerKey', value)}
                    placeholder="Consumer Key"
                vars={variables}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oauth1-consumer-secret">Consumer Secret</Label>
                  <UrlVariableInput
                    id="oauth1-consumer-secret"
                    value={getAuthParam(effectiveAuth?.oauth1, 'consumerSecret')}
                    onChange={(value) => updateParam('oauth1', 'consumerSecret', value)}
                    placeholder="Consumer Secret"
                    type={showSecrets ? 'text' : 'password'}
                vars={variables}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="oauth1-token">Access Token</Label>
                  <UrlVariableInput
                    id="oauth1-token"
                    value={getAuthParam(effectiveAuth?.oauth1, 'token')}
                    onChange={(value) => updateParam('oauth1', 'token', value)}
                    placeholder="Access Token"
                vars={variables}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oauth1-token-secret">Token Secret</Label>
                  <UrlVariableInput
                    id="oauth1-token-secret"
                    value={getAuthParam(effectiveAuth?.oauth1, 'tokenSecret')}
                    onChange={(value) => updateParam('oauth1', 'tokenSecret', value)}
                    placeholder="Token Secret"
                    type={showSecrets ? 'text' : 'password'}
                vars={variables}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Signature Method</Label>
                <Select
                  value={getAuthParam(effectiveAuth?.oauth1, 'signatureMethod') || 'HMAC-SHA1'}
                  onValueChange={(value) => updateParam('oauth1', 'signatureMethod', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HMAC-SHA1">HMAC-SHA1</SelectItem>
                    <SelectItem value="HMAC-SHA256">HMAC-SHA256</SelectItem>
                    <SelectItem value="RSA-SHA1">RSA-SHA1</SelectItem>
                    <SelectItem value="PLAINTEXT">PLAINTEXT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Hawk Auth */}
          {authType === 'hawk' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hawk-id">Hawk Auth ID</Label>
                <UrlVariableInput
                  id="hawk-id"
                  value={getAuthParam(effectiveAuth?.hawk, 'authId')}
                  onChange={(value) => updateParam('hawk', 'authId', value)}
                  placeholder="Hawk Auth ID"
                vars={variables}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hawk-key">Hawk Auth Key</Label>
                <UrlVariableInput
                  id="hawk-key"
                  value={getAuthParam(effectiveAuth?.hawk, 'authKey')}
                  onChange={(value) => updateParam('hawk', 'authKey', value)}
                  placeholder="Hawk Auth Key"
                  type={showSecrets ? 'text' : 'password'}
                vars={variables}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hawk-algorithm">Algorithm</Label>
                <Select
                  value={getAuthParam(effectiveAuth?.hawk, 'algorithm') || 'sha256'}
                  onValueChange={(value) => updateParam('hawk', 'algorithm', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sha256">SHA256</SelectItem>
                    <SelectItem value="sha1">SHA1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* NTLM */}
          {authType === 'ntlm' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ntlm-username">Username</Label>
                <UrlVariableInput
                  id="ntlm-username"
                  value={getAuthParam(effectiveAuth?.ntlm, 'username')}
                  onChange={(value) => updateParam('ntlm', 'username', value)}
                  placeholder="Enter username"
                vars={variables}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ntlm-password">Password</Label>
                <UrlVariableInput
                  id="ntlm-password"
                  value={getAuthParam(effectiveAuth?.ntlm, 'password')}
                  onChange={(value) => updateParam('ntlm', 'password', value)}
                  placeholder="Enter password"
                  type={showSecrets ? 'text' : 'password'}
                vars={variables}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ntlm-domain">Domain (optional)</Label>
                <UrlVariableInput
                  id="ntlm-domain"
                  value={getAuthParam(effectiveAuth?.ntlm, 'domain')}
                  onChange={(value) => updateParam('ntlm', 'domain', value)}
                  placeholder="DOMAIN"
                vars={variables}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ntlm-workstation">Workstation (optional)</Label>
                <UrlVariableInput
                  id="ntlm-workstation"
                  value={getAuthParam(effectiveAuth?.ntlm, 'workstation')}
                  onChange={(value) => updateParam('ntlm', 'workstation', value)}
                  placeholder="WORKSTATION"
                vars={variables}
                />
              </div>
            </div>
          )}

          {/* Custom Auth */}
          {authType === 'custom' && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md mb-4">
                <div className="text-sm text-muted-foreground">
                  Add custom authentication headers. Use the Headers tab for more complex scenarios.
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-header-name">Header Name</Label>
                <UrlVariableInput
                  id="custom-header-name"
                  value={getAuthParam(effectiveAuth?.custom, 'headerName') || 'Authorization'}
                  onChange={(value) => updateParam('custom', 'headerName', value)}
                  placeholder="e.g., Authorization, X-Auth-Token"
                vars={variables}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-header-value">Header Value</Label>
                <UrlVariableInput
                  id="custom-header-value"
                  value={getAuthParam(effectiveAuth?.custom, 'headerValue')}
                  onChange={(value) => updateParam('custom', 'headerValue', value)}
                  placeholder="Enter value or {{variable}}"
                  type={showSecrets ? 'text' : 'password'}
                vars={variables}
                />
              </div>
            </div>
          )}

          {/* Not implemented yet message for some auth types */}
          {['edgegrid'].includes(authType) && (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                {authType.charAt(0).toUpperCase() + authType.slice(1)} authentication is not implemented yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}