import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import AuthPageShell from '@/components/auth/AuthPageShell';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <AuthPageShell
          eyebrow="Team Login"
          title="Welcome to Veagle Attendee"
          description="Sign in to manage attendance, check-ins, and your daily work in one place."
          footer={null}>
          <LoginForm />
        </AuthPageShell>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
