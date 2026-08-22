import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateMeDto } from './dto/update-me.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email já cadastrado');

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: await bcrypt.hash(dto.password, SALT_ROUNDS),
      },
    });
    return this.signToken(user.id, user.email, user.name);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // Mensagem única para email inexistente e senha errada — não vaza qual dos dois falhou
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    return this.signToken(user.id, user.email, user.name);
  }

  // Atualiza os próprios dados. Alterar email ou senha exige a senha atual.
  // Reassina o token (o JWT carrega name/email) para a sessão refletir a mudança.
  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Sessão inválida');

    const sensitive = dto.email !== undefined || dto.newPassword !== undefined;
    if (sensitive) {
      const ok =
        !!dto.currentPassword &&
        (await bcrypt.compare(dto.currentPassword, user.password));
      if (!ok) throw new UnauthorizedException('Senha atual incorreta');
    }

    if (dto.email && dto.email !== user.email) {
      const taken = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (taken) throw new ConflictException('Email já cadastrado');
    }

    const data: { name?: string; email?: string; password?: string } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.newPassword)
      data.password = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.signToken(updated.id, updated.email, updated.name);
  }

  private async signToken(sub: string, email: string, name: string) {
    const token = await this.jwtService.signAsync({ sub, email, name });
    return { token, user: { id: sub, email, name } };
  }
}
