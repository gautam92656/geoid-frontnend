"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "react-bootstrap";

const FAQS = [
  {
    q: "What is GeoID?",
    a: "GeoID is a cloud-based platform for geotechnical engineers to capture digital boring logs, manage borehole data, and generate professional reports from field to office.",
  },
  {
    q: "Can I use GeoID offline in the field?",
    a: "Yes. GeoID supports offline field logging on mobile devices. Data syncs automatically when an internet connection is available.",
  },
  {
    q: "What export formats are supported?",
    a: "We support exporting geotechnical data and boring logs in industry standard formats, including AGS, DIGGS, and CAD ready outputs.",
  },
  {
    q: "Is it suitable for both small teams and large firms?",
    a: "Yes. The platform is designed to scale from small geotechnical teams to large consulting firms with multi-user collaboration and standardized data management.",
  },
  {
    q: "Is my geotechnical data secure?",
    a: "Yes. We are built with enterprise grade security and compliance measures to protect geotechnical project data at every stage.",
  },
  {
    q: "Do I need to install any software?",
    a: "No — the platform runs in the cloud. Users can access it via a web browser and mobile devices, with offline field data syncing when a connection is available.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="landing-section landing-section--alt">
      <Container>
        <div className="landing-section__header landing-section__header--center">
          <span className="landing-eyebrow">FAQ</span>
          <h2 className="landing-section__title">Frequently Asked Questions</h2>
          <p className="landing-section__text">
            Everything you need to know. Can&apos;t find the answer you&apos;re looking for?{" "}
            <Link href="/register" className="landing-link">
              Contact our team
            </Link>
            .
          </p>
        </div>

        <div className="landing-faq">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.q} className={`landing-faq__item${isOpen ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="landing-faq__question"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  {faq.q}
                  <span className="landing-faq__icon" aria-hidden="true">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && <div className="landing-faq__answer">{faq.a}</div>}
              </div>
            );
          })}
        </div>

        <div className="landing-faq__cta">
          <h3>Still have questions?</h3>
          <p>Our team of geotechnical engineers is here to help you get started.</p>
          <div className="d-flex flex-wrap gap-3 justify-content-center">
            <Link href="/register" className="btns">
              Contact Us
            </Link>
            <Link href="/register" className="btns btns-outline">
              Book a Demo
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
