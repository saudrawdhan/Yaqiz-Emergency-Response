![Test](./images/Harnessing%20Deep%20Learning%20to%20Optimize%20Emergency%20Response.png)

# Harnessing Deep Learning to Optimize Emergency Response

An AI-powered system for automatic accident detection from live traffic camera feeds to reduce emergency response times.

## Team Members

| # | Name | Role |
|---|------|----|
| 1 | Mohammed Kamal Hadi | Leader |
| 2 | Abdulrhman Mohammed Alshehri | Member |
| 3 | Saud Ali Rawdhan | Member |
| 4 | Ahmad Abdulqader Alakhdar | Member |
| 5 | Ali Ibrahim Asiri | Member |

**Supervised by:** Dr. Mohammad Aftab Alam Khan (Supervisor) and Dr. Atta-ur-Rahman (Co-supervisor)

**Committee Members:** Dr. Ito Wasio and Dr. Rabab Alkhalifa

## First Semester (August 2025 - December 2025)

### Work Completed

The first semester focused on planning, requirements gathering, and system design:

#### Phase 1: Project Initiation & Proposal (Aug 31 - Sep 18, 2025)
- Proposal approval
- Team planning and role assignment
- Initial project scope definition

#### Phase 2: Literature Review (Sep 21 - Oct 2, 2025)
- Thorough examination of past research
- Review of current accident detection technologies
- Analysis of existing solutions and their limitations

#### Phase 3: Project Plan & Mid-Semester Report (Oct 5 - Oct 16, 2025)
- Software Project Management Plan (SPMP) creation
- Work plan development
- Mid-semester report submission

#### Phase 4: System Requirements Specification (Oct 19 - Oct 30, 2025)
- Gathering and analyzing system requirements
- Defining functional and non-functional requirements
- Documentation of requirements in SRS format

#### Phase 5: System Design Specification (Nov 2 - Nov 13, 2025)
- Architecture design
- Data flow specification
- Technical design documentation

#### Phase 6: Final Design & Report Writing (Nov 16 - Dec 11, 2025)
- Design finalization
- First semester final report writing
- Documentation completion

#### Phase 7: Final Presentation (Dec 14 - Dec 18, 2025)
- Presentation preparation
- Final presentation delivery

### Summary

The first semester established the project foundation through comprehensive planning, requirements analysis, and detailed system design. Key deliverables included:
- Project proposal and approval
- Literature review
- Software Project Management Plan (SPMP)
- System Requirements Specification (SRS)
- System Design Specification (SDS)
- Final report and presentation

## Second Semester (January 2026 - June 2026)

### Planned Work

The second semester will focus on implementation, testing, deployment, and final presentation:

#### Week 1: Documentation (Jan 18, 2026)
- Documentation of examiners' feedback from first semester
- Review and address committee recommendations

#### Weeks 2-8: Implementation Phase (Jan 25 - Mar 29, 2026)
- Development of a multi-path accident detection pipeline: EfficientNet-B0 (frame classifier), TimeSformer (video ViT, F1=0.88), and YOLO11+ByteTrack (physics-informed tracker)
- Implementation of real-time video processing with scale-invariant collision detection (BH/s²)
- Training on the CADP dataset (230 videos, 10,313 annotated frames)
- Development of a VLM triage module using Qwen2.5-VL-7B-AWQ for structured emergency reports
- Development of the alert dashboard using React/TypeScript and Supabase
- Integration of all system components into a unified pipeline
- Bi-weekly progress reports (Reports #1, #2, #3, #4)
- **Midterm Report Submission:** March 29, 2026

#### Weeks 9-12: Testing Phase (Apr 5 - Apr 26, 2026)
- Unit testing of individual components
- Integration testing of the complete system
- Performance testing for real-time detection latency
- Validation against target metrics (85%+ precision/recall/F1-score, sub-2-second latency)
- Testing with various weather conditions and camera angles
- Bi-weekly progress reports (Reports #5, #6)

#### Weeks 13-15: Deployment Phase (May 3 - May 17, 2026)
- End-user deployment and configuration
- User manual preparation
- Installation guide creation
- System operation and maintenance documentation
- Project showcase participation (May 3-18, 2026)
- Final report writing and submission
- Bi-weekly progress report (Report #7)
- **Final Report Submission:** May 17, 2026

#### Weeks 16-19: Final Presentation (May 19 - June 23, 2026)
- Presentation preparation
- Final project demonstration
- Oral presentation to faculty committee
- **Presentation Period:** May 19 - June 23, 2026

### Bi-Weekly Progress Reports
Throughout the semester, the team will submit seven bi-weekly progress reports documenting:
- Work completed during the period
- Challenges encountered and solutions implemented
- Plans for the next reporting period
- Alignment with project timeline and objectives

### Technologies and Tools
- **Programming Language:** Python
- **Deep Learning Framework:** PyTorch
- **Models:** EfficientNet-B0, TimeSformer, YOLOv11, Qwen2.5-VL-7B-AWQ (INT4)
- **Object Tracking:** ByteTrack with height-normalized velocity (BH/s²)
- **Video Processing:** OpenCV, Decord
- **Dashboard:** React 18 / TypeScript (Vite), Supabase
- **Compute:** Google Colab Pro (T4 GPU, 15.6 GB VRAM)
- **Version Control:** Git/GitHub
- **Collaboration:** Microsoft Teams, Google Drive

### Target Deliverables
- Bi-weekly progress reports (7 reports)
- Midterm report (March 29, 2026)
- Fully functional accident detection system
- Trained model with optimized weights
- Alert dashboard interface
- Complete system documentation
- User manual and installation guide
- System operation and maintenance guide
- Final report (May 17, 2026)
- Project showcase demonstration (May 3-18, 2026)
- Final presentation (May 19 - June 23, 2026)
- Source code repository on GitHub

## Project Timeline

**Overall Duration:** August 31, 2025 - June 23, 2026

- **First Semester (Aug 2025 - Dec 2025):** Planning, requirements, and design
- **Second Semester (Jan 2026 - Jun 2026):** Implementation, testing, deployment, and presentation

## License

This project is submitted in partial fulfillment of the requirements for the degree of Bachelor of Science in Artificial Intelligence at Imam Abdulrahman Bin Faisal University.

