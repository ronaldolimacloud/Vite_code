import React, { ReactNode, useEffect, useState } from 'react';
import { Authenticator, ThemeProvider, defaultDarkModeOverride, View, Heading, Button, useTheme } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { signOut, getCurrentUser } from 'aws-amplify/auth';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [username, setUsername] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        setUsername(user.username);
      } catch (error) {
        // User is not authenticated
        console.log('User not authenticated', error);
      }
    };
    
    fetchUser();
  }, []);
  
  // Define a custom theme to match our news portal design
  const theme = {
    name: 'news-portal-theme',
    overrides: [defaultDarkModeOverride],
    tokens: {
      colors: {
        brand: {
          primary: {
            10: '#f0f9ff',
            20: '#e0f2fe',
            40: '#bae6fd',
            60: '#7dd3fc',
            80: '#38bdf8',
            90: '#0ea5e9',
            100: '#0284c7',
          },
        },
      },
      components: {
        authenticator: {
          router: {
            borderWidth: '0',
          },
        },
      },
    },
  };

  const services = {
    async handleSignOut() {
      try {
        await signOut();
        setUsername(null);
      } catch (error) {
        console.error('Error signing out: ', error);
      }
    }
  };

  const components = {
    Header() {
      const { tokens } = useTheme();
      
      return (
        <View textAlign="center" padding={tokens.space.large}>
          <Heading level={3}>Welcome to News Portal</Heading>
        </View>
      );
    },
    Footer() {
      const { tokens } = useTheme();
      
      return (
        <View textAlign="center" padding={tokens.space.large}>
          <p style={{ color: tokens.colors.neutral[80].toString() }}>© 2023 News Portal</p>
        </View>
      );
    }
  };

  // If the user is already authenticated, show the content
  if (username) {
    return (
      <div>
        <div className="bg-blue-50 border-b border-blue-100 py-2 px-4 text-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              Signed in as: <span className="font-medium">{username}</span>
            </div>
            <button 
              onClick={services.handleSignOut}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
        {children}
      </div>
    );
  }

  // If not authenticated, show the authenticator
  return (
    <ThemeProvider theme={theme}>
      <Authenticator 
        components={components}
        loginMechanisms={['email']}
        signUpAttributes={['given_name', 'family_name']}
        formFields={{
          // Sign Up form fields
          signUp: {
            given_name: {
              placeholder: 'First Name',
              label: 'First Name',
              isRequired: true,
            },
            family_name: {
              placeholder: 'Last Name',
              label: 'Last Name',
              isRequired: false,
            },
            email: {
              placeholder: 'Email address',
              label: 'Email',
              isRequired: true,
            },
            password: {
              placeholder: 'Create password',
              label: 'Password',
              isRequired: true,
            },
            confirm_password: {
              placeholder: 'Confirm password',
              label: 'Confirm Password',
              isRequired: true,
            },
          },
          // Sign In form fields
          signIn: {
            username: {
              placeholder: 'Enter your email',
              label: 'Email',
              isRequired: true,
            },
            password: {
              placeholder: 'Enter your password',
              label: 'Password',
              isRequired: true,
            },
          },
        }}
      >
        {({ signOut: _signOut, user: _user }) => {
          return <>{children}</>;
        }}
      </Authenticator>
    </ThemeProvider>
  );
}

// Wrapper component that can be used to check if user is authenticated
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function WithAuth(props: P) {
    return (
      <AuthProvider>
        <Component {...props} />
      </AuthProvider>
    );
  };
} 