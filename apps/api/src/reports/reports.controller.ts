import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import {
  CandidatesQueryDto,
  GenerateReportDto,
  UpsertReportProfileDto,
} from './dto/report.dto';
import { ReportsService } from './reports.service';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

@Controller('projects/:projectId')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Candidatos pré-preenchidos para a tela de revisão (De/Até)
  @Get('reports/candidates')
  candidates(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Query() query: CandidatesQueryDto,
  ) {
    return this.reportsService.getCandidates(
      user.id,
      projectId,
      query.from,
      query.to,
    );
  }

  // Gera o .docx (salvando o snapshot) e devolve como download (attachment)
  @Post('reports/generate')
  async generate(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: GenerateReportDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { filename, buffer } = await this.reportsService.generate(
      user.id,
      projectId,
      dto,
    );
    res.set({
      'Content-Type': DOCX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  // ----- Histórico (snapshots) -----
  @Get('reports')
  listReports(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    return this.reportsService.listReports(user.id, projectId);
  }

  @Get('reports/:reportId/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('reportId') reportId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { filename, buffer } = await this.reportsService.downloadReport(
      user.id,
      reportId,
    );
    res.set({
      'Content-Type': DOCX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  // ----- ReportProfile (cabeçalho do relatório) -----
  @Get('report-profile')
  getProfile(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    return this.reportsService.getProfile(user.id, projectId);
  }

  @Put('report-profile')
  upsertProfile(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: UpsertReportProfileDto,
  ) {
    return this.reportsService.upsertProfile(user.id, projectId, dto);
  }
}
