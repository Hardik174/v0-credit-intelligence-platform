'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Bell, Lock, Palette } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your preferences and account settings</p>
      </div>

      {/* User Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            User Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <Label>Dark Mode</Label>
            <Switch />
          </div>
          <div className="flex items-center justify-between py-2">
            <Label>Compact View</Label>
            <Switch defaultChecked={false} />
          </div>
          <div className="flex items-center justify-between py-2">
            <Label>Show Confidence Scores</Label>
            <Switch defaultChecked={true} />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <Label>Email Notifications</Label>
            <Switch defaultChecked={true} />
          </div>
          <div className="flex items-center justify-between py-2">
            <Label>Document Upload Alerts</Label>
            <Switch defaultChecked={true} />
          </div>
          <div className="flex items-center justify-between py-2">
            <Label>Risk Score Changes</Label>
            <Switch defaultChecked={true} />
          </div>
          <div className="flex items-center justify-between py-2">
            <Label>CAM Generation Alerts</Label>
            <Switch defaultChecked={true} />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-gray-500 mt-0.5">Enhance your account security</p>
            </div>
            <Switch />
          </div>
          <Button variant="outline" className="w-full justify-center">
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Theme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {['Light', 'Dark', 'Auto'].map((theme) => (
              <div key={theme} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={theme}
                  name="theme"
                  defaultChecked={theme === 'Light'}
                  className="w-4 h-4"
                />
                <Label htmlFor={theme} className="cursor-pointer">
                  {theme}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-900">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" className="w-full">
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
