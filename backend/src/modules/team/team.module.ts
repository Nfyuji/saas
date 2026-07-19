import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { TeamInvite, TeamInviteSchema } from '../../schemas/team-invite.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { PlanEntitlementsModule } from '../../common/services/plan-entitlements.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TeamInvite.name, schema: TeamInviteSchema },
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    PlanEntitlementsModule,
  ],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
