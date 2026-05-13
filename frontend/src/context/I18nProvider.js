"use client";
import React from 'react';
import { I18nextProvider } from 'react-i18next';
// Kjo rrugë (path) tani është e saktë: shkon një nivel lart dhe futet te lib
import i18n from '../lib/i18n'; 

export default function I18nProvider({ children }) {
  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}