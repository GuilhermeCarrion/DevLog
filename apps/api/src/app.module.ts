import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgendaModule } from './agenda/agenda.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { NotesModule } from './notes/notes.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { SessionsModule } from './sessions/sessions.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    // Lê o .env e disponibiliza via ConfigService em toda a aplicação
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    GroupsModule,
    TasksModule,
    SessionsModule,
    NotesModule,
    AgendaModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
