'use client';

import React, { useState } from 'react';
import { useCAM } from '@/hooks/useCAM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChartSkeleton } from '@/components/shared/LoadingSkeleton';
import { Download, Share2, Edit2, Check } from 'lucide-react';

export default function CAMReportPage() {
  const { cam, isLoading, updateSection } = useCAM();
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (!cam) {
    return <div>No CAM report available</div>;
  }

  const handleEditSection = (sectionId: string, content: string) => {
    setEditingSectionId(sectionId);
    setEditContent(content);
  };

  const handleSaveSection = (sectionId: string) => {
    updateSection(sectionId, editContent);
    setEditingSectionId(null);
    setEditContent('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Credit Assessment Memorandum</h1>
          <p className="text-gray-600 mt-1">CAM Status: {cam.status}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* CAM Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="capitalize">
              {cam.status.replace('_', ' ')}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {new Date(cam.generatedAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Last Modified</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {new Date(cam.lastModified).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CAM Sections */}
      <div className="space-y-4">
        {cam.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{section.title}</CardTitle>
                {editingSectionId !== section.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSection(section.id, section.content)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingSectionId === section.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-64 font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveSection(section.id)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSectionId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="cam-content prose prose-sm max-w-none">
                  {section.content.split('\n').map((paragraph, i) => {
                    if (paragraph.startsWith('##')) {
                      return (
                        <h2
                          key={i}
                          className="text-lg font-semibold text-gray-900 mt-4 mb-2"
                        >
                          {paragraph.replace('##', '').trim()}
                        </h2>
                      );
                    }
                    if (paragraph.startsWith('###')) {
                      return (
                        <h3
                          key={i}
                          className="text-base font-medium text-gray-800 mt-3 mb-2"
                        >
                          {paragraph.replace('###', '').trim()}
                        </h3>
                      );
                    }
                    if (paragraph.startsWith('-') || paragraph.startsWith('*')) {
                      return (
                        <li key={i} className="text-gray-600 ml-6">
                          {paragraph.replace(/^[-*]\s/, '').trim()}
                        </li>
                      );
                    }
                    if (paragraph.startsWith('|')) {
                      return (
                        <p key={i} className="text-xs font-mono text-gray-600 overflow-x-auto">
                          {paragraph}
                        </p>
                      );
                    }
                    if (paragraph.trim()) {
                      return (
                        <p key={i} className="text-gray-600 mb-2 leading-relaxed">
                          {paragraph.trim()}
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
